import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const BCRYPT_WORK_FACTOR = 12;

@Injectable()
export class PasswordService {
  hash(password: string) {
    return bcrypt.hashSync(password, BCRYPT_WORK_FACTOR);
  }

  verify(password: string, storedHash: string | null) {
    if (!storedHash) return false;

    return bcrypt.compareSync(password, storedHash);
  }
}
