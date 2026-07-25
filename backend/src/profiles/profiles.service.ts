import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Visibility } from '@prisma/client';
import { RequestUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ListProfilesQueryDto } from './dto/list-profiles-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileInclude = {
  user: {
    select: {
      uuid: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  },
};

type ProfileScoreInput = {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  educationLevel?: string | null;
  portfolioUrl?: string | null;
  cvUrl?: string | null;
  skills?: string[];
  careerInterests?: string[];
  languages?: string[];
  verifiedBadgeCount?: number;
  endorsementCount?: number;
};

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProfileDto: CreateProfileDto, requester: RequestUser) {
    const { userUuid, ...profileData } = createProfileDto;

    if (requester.role !== Role.ADMINISTRATOR && requester.sub !== userUuid) {
      throw new ForbiddenException('You can only create your own profile.');
    }

    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userUuid} was not found.`);
    }

    try {
      return await this.prisma.profile.create({
        data: {
          ...this.withComputedScores(profileData),
          userId: user.id,
        },
        include: profileInclude,
      });
    } catch (error) {
      this.handleKnownErrors(error);
    }
  }

  async findAll(filters: ListProfilesQueryDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.ProfileWhereInput = {
      visibility: filters.visibility,
      brandScore:
        filters.minBrandScore === undefined
          ? undefined
          : { gte: filters.minBrandScore },
      OR: filters.search
        ? [
            { headline: { contains: filters.search, mode: 'insensitive' } },
            { bio: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
            {
              user: {
                OR: [
                  { firstName: { contains: filters.search, mode: 'insensitive' } },
                  { lastName: { contains: filters.search, mode: 'insensitive' } },
                  { email: { contains: filters.search, mode: 'insensitive' } },
                ],
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        orderBy: [{ brandScore: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: profileInclude,
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary() {
    const [total, publicProfiles, employersOnly, average] =
      await this.prisma.$transaction([
        this.prisma.profile.count(),
        this.prisma.profile.count({ where: { visibility: Visibility.PUBLIC } }),
        this.prisma.profile.count({
          where: { visibility: Visibility.EMPLOYERS_ONLY },
        }),
        this.prisma.profile.aggregate({ _avg: { brandScore: true } }),
      ]);

    return {
      total,
      publicProfiles,
      employersOnly,
      averageBrandScore: Math.round(average._avg.brandScore ?? 0),
    };
  }

  async findOne(uuid: string, requester?: RequestUser) {
    const profile = await this.prisma.profile.findUnique({
      where: { uuid },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException(`Profile ${uuid} was not found.`);
    }

    if (requester) this.assertCanRead(profile, requester);

    return profile;
  }

  async findByUser(userUuid: string, requester?: RequestUser) {
    if (
      requester &&
      requester.role !== Role.ADMINISTRATOR &&
      requester.sub !== userUuid
    ) {
      throw new ForbiddenException('You can only view your own private profile.');
    }

    const profile = await this.prisma.profile.findFirst({
      where: { user: { uuid: userUuid } },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userUuid} was not found.`);
    }

    return profile;
  }

  async findPublic(uuid: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        uuid,
        visibility: Visibility.PUBLIC,
      },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException(`Public profile ${uuid} was not found.`);
    }

    return profile;
  }

  async getCompleteness(uuid: string, requester: RequestUser) {
    const profile = await this.findOne(uuid, requester);

    return {
      profileUuid: profile.uuid,
      profileCompleteness: profile.profileCompleteness,
      brandScore: profile.brandScore,
      recommendations: this.getRecommendations(profile),
      scoreFormula: {
        profileCompleteness: '25%',
        verifiedSkillBadges: '70%',
        peerEndorsements: '5%',
      },
    };
  }

  async update(uuid: string, updateProfileDto: UpdateProfileDto, requester: RequestUser) {
    const existingProfile = await this.findOne(uuid);
    this.assertCanMutate(existingProfile, requester);
    const scoringInput = {
      ...existingProfile,
      ...updateProfileDto,
    };

    return this.prisma.profile.update({
      where: { uuid },
      data: {
        ...updateProfileDto,
        ...this.getComputedScores(scoringInput),
      },
      include: profileInclude,
    });
  }

  async updateVisibility(uuid: string, visibility: Visibility, requester: RequestUser) {
    const existingProfile = await this.findOne(uuid);
    this.assertCanMutate(existingProfile, requester);

    return this.prisma.profile.update({
      where: { uuid },
      data: { visibility },
      include: profileInclude,
    });
  }

  async remove(uuid: string, requester: RequestUser) {
    const existingProfile = await this.findOne(uuid);
    this.assertCanMutate(existingProfile, requester);

    return this.prisma.profile.delete({
      where: { uuid },
      include: profileInclude,
    });
  }

  async recomputeScoresByUserId(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        headline: true,
        bio: true,
        location: true,
        educationLevel: true,
        portfolioUrl: true,
        cvUrl: true,
        skills: true,
        careerInterests: true,
        languages: true,
      },
    });

    if (!profile) return null;

    const [verifiedBadgeCount, endorsementCount] = await this.prisma.$transaction([
      this.prisma.skillBadge.count({ where: { userId, status: 'ISSUED' } }),
      this.prisma.peerEndorsement.count({ where: { profileId: profile.id } }),
    ]);
    const scores = this.getComputedScores({
      ...profile,
      verifiedBadgeCount,
      endorsementCount,
    });

    return this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        verifiedBadgeCount,
        endorsementCount,
        ...scores,
      },
      include: profileInclude,
    });
  }

  private handleKnownErrors(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('This user already has a profile.');
    }

    throw error;
  }

  private assertCanRead(
    profile: { visibility: Visibility; user: { uuid: string } },
    requester: RequestUser,
  ) {
    if (requester.role === Role.ADMINISTRATOR || requester.role === Role.ANALYST) {
      return;
    }

    if (profile.user.uuid === requester.sub) {
      return;
    }

    if (
      requester.role === Role.EMPLOYER &&
      (profile.visibility === Visibility.PUBLIC ||
        profile.visibility === Visibility.EMPLOYERS_ONLY)
    ) {
      return;
    }

    if (profile.visibility === Visibility.PUBLIC) {
      return;
    }

    throw new ForbiddenException('You do not have permission to view this profile.');
  }

  private assertCanMutate(
    profile: { user: { uuid: string } },
    requester: RequestUser,
  ) {
    if (requester.role === Role.ADMINISTRATOR || profile.user.uuid === requester.sub) {
      return;
    }

    throw new ForbiddenException('You can only modify your own profile.');
  }

  private withComputedScores<T extends ProfileScoreInput>(profileData: T) {
    return {
      ...profileData,
      ...this.getComputedScores(profileData),
    };
  }

  private getComputedScores(profileData: ProfileScoreInput) {
    const profileCompleteness = this.calculateCompleteness(profileData);
    const brandScore = this.calculateBrandScore({
      profileCompleteness,
      verifiedBadgeCount: profileData.verifiedBadgeCount ?? 0,
      endorsementCount: profileData.endorsementCount ?? 0,
    });

    return { profileCompleteness, brandScore };
  }

  private calculateCompleteness(profileData: ProfileScoreInput) {
    const checks = [
      Boolean(profileData.headline),
      Boolean(profileData.bio),
      Boolean(profileData.location),
      Boolean(profileData.educationLevel),
      Boolean(profileData.portfolioUrl || profileData.cvUrl),
      Boolean(profileData.skills?.length),
      Boolean(profileData.careerInterests?.length),
      Boolean(profileData.languages?.length),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private calculateBrandScore(input: {
    profileCompleteness: number;
    verifiedBadgeCount: number;
    endorsementCount: number;
  }) {
    const badgeScore = Math.min(input.verifiedBadgeCount * 20, 100);
    const endorsementScore = Math.min(input.endorsementCount * 20, 100);

    return Math.round(
      input.profileCompleteness * 0.25 +
        badgeScore * 0.7 +
        endorsementScore * 0.05,
    );
  }

  private getRecommendations(profile: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    educationLevel: string | null;
    portfolioUrl: string | null;
    cvUrl: string | null;
    skills: string[];
    careerInterests: string[];
    languages: string[];
    verifiedBadgeCount: number;
    endorsementCount: number;
  }) {
    const recommendations: string[] = [];

    if (!profile.headline) recommendations.push('Add a professional headline.');
    if (!profile.bio) recommendations.push('Write a short biography.');
    if (!profile.location) recommendations.push('Add your current location.');
    if (!profile.educationLevel) recommendations.push('Add your education level.');
    if (!profile.portfolioUrl && !profile.cvUrl) {
      recommendations.push('Add a portfolio or CV link.');
    }
    if (profile.skills.length === 0) recommendations.push('Add practical skills.');
    if (profile.careerInterests.length === 0) {
      recommendations.push('Add career interests.');
    }
    if (profile.languages.length === 0) recommendations.push('Add languages.');
    if (profile.verifiedBadgeCount === 0) {
      recommendations.push('Complete a validation challenge when the skills module is added.');
    }
    if (profile.endorsementCount === 0) {
      recommendations.push('Request peer endorsements when endorsements are added.');
    }

    return recommendations;
  }
}
