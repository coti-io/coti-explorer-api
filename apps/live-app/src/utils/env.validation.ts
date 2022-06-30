import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export function validate() {
  return ConfigModule.forRoot({
    envFilePath: '.env.live-app',
    isGlobal: true,
    validationSchema: Joi.object({
      DB_APP_HOST: Joi.string().exist(),
      DB_APP_PORT: Joi.number().exist(),
      DB_APP_USER: Joi.string().exist(),
      DB_APP_PASSWORD: Joi.string().exist(),
      DB_APP_NAME: Joi.string().exist(),

      DB_PORT: Joi.string().exist(),
      DB_HOST: Joi.string().exist(),
      DB_USER: Joi.string().exist(),
      DB_PASSWORD: Joi.string().exist(),
      DB_NAME: Joi.string().exist(),

      COTI_CURRENCY_HASH: Joi.string().exist(),

      REDIS_IP: Joi.string().exist(),
      REDIS_PORT: Joi.number().exist(),

      MAX_CONSENSUS_REPORT_TIME: Joi.number().exist(),

      NODE_MANAGER_URL: Joi.string().exist(),
    }),
    validationOptions: {
      allowUnknown: true,
      abortEarly: true,
    },
  });
}
