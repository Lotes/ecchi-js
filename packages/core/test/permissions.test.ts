import { describe, test } from 'vitest'
import { $Roles, UserType } from './generated.fake.js';

describe("Core", () => {
  test("Permissions", () => {
    const user: UserType = { $type: 'UserType', id: 1, name: 'John' };
    
  });
});