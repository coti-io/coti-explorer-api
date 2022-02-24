import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export function validate() {
  return ConfigModule.forRoot({
    isGlobal: true,
    validationSchema: Joi.object({
      DB_SYNC_HOST: Joi.string().exist(),
      DB_SYNC_PORT: Joi.number().exist(),
      DB_SYNC_USER: Joi.string().exist(),
      DB_SYNC_PASSWORD: Joi.string().exist(),
      DB_SYNC_NAME: Joi.string().exist(),
    }),
    validationOptions: {
      allowUnknown: true,
      abortEarly: true,
    },
  });
}
