import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export function validate() {
  return ConfigModule.forRoot({
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
    }),
    validationOptions: {
      allowUnknown: true,
      abortEarly: true,
    },
  });
}
