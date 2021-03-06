export enum UserLocked {
  LOCKED = 1,
  UN_LOCK = 0,
}

export enum UserIsValid {
  NOT_ALLOW = 0,
  ALLOW = 1,
}

export const HAS_VALID = 'HAS_BEEN_VALIDATE';

export const TOKEN_FORMAT = {
  client: 'clients:%s',
  token: 'tokens:%s',
  user: 'users:%s',
};
