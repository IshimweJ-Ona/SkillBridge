import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'ok';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch (error) {
      dbStatus = 'unhealthy';
      throw new ServiceUnavailableException({
        status: 'error',
        service: process.env.SKILLBRIDGE_SERVICE ?? 'skillbridge-api',
        database: { status: dbStatus, error: error instanceof Error ? error.message : 'DB connection failed' },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      apiVersion: 'v1',
      service: process.env.SKILLBRIDGE_SERVICE ?? 'skillbridge-api',
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
