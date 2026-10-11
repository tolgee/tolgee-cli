import { NO_PROJECT, resolveProjectId } from '#cli/config/projectId.js';

describe('which project a command runs against', () => {
  it('takes the one the command line named', () => {
    expect(resolveProjectId({ configured: 7 })).toEqual({ projectId: 7 });
  });

  it('leaves the missing one missing, so validateOptions can say so', () => {
    expect(resolveProjectId({ configured: NO_PROJECT })).toEqual({
      projectId: NO_PROJECT,
    });
  });

  describe('with a project API key', () => {
    it('takes the project out of the key', () => {
      expect(
        resolveProjectId({ configured: NO_PROJECT, apiKeyProject: 3 })
      ).toEqual({ projectId: 3 });
    });

    it('refuses a project the key cannot reach', () => {
      const { refusal } = resolveProjectId({
        configured: 4,
        apiKeyProject: 3,
      });

      expect(refusal?.error).toMatch(/API key cannot be used/i);
      expect(refusal?.details.join('\n')).toContain('#3');
    });
  });

  describe('with a browser login approved for one project', () => {
    it('takes that project when the command named none', () => {
      expect(
        resolveProjectId({ configured: NO_PROJECT, sessionProject: 12 })
      ).toEqual({ projectId: 12 });
    });

    it('agrees when the command named the same one', () => {
      expect(resolveProjectId({ configured: 12, sessionProject: 12 })).toEqual({
        projectId: 12,
      });
    });

    it('refuses a project the approval does not cover, rather than collecting a 403', () => {
      const { refusal } = resolveProjectId({
        configured: 5,
        sessionProject: 12,
      });

      expect(refusal?.error).toMatch(/browser login cannot be used/i);
      expect(refusal?.details.join('\n')).toContain('#12');
      expect(refusal?.details.join('\n')).toMatch(/tolgee login/);
    });
  });

  it('lets the key win over a session, since the key is what the request carries', () => {
    expect(
      resolveProjectId({
        configured: NO_PROJECT,
        apiKeyProject: 3,
        sessionProject: 12,
      })
    ).toEqual({ projectId: 3 });
  });
});
