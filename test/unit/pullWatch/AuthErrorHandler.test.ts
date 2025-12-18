import { AuthErrorHandler } from '#cli/utils/pullWatch/AuthErrorHandler.js';
import { isVersionAtLeast } from '#cli/utils/isVersionAtLeast.js';
import { createTolgeeClient } from '#cli/client/TolgeeClient.js';
import { error } from '#cli/utils/logger.js';

// Mock the dependencies
vi.mock('#cli/utils/isVersionAtLeast.js', () => ({
  isVersionAtLeast: vi.fn(),
}));

vi.mock('#cli/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
}));

vi.mock('#cli/client/TolgeeClient.js', () => ({
  createTolgeeClient: vi.fn(),
}));

// Mock console.log to capture output (removed since it's not working properly with vi.mock)

describe('AuthErrorHandler', () => {
  let mockClient: ReturnType<typeof createTolgeeClient>;
  let authErrorHandler: ReturnType<typeof AuthErrorHandler>;
  let mockShutdown: ReturnType<typeof vi.fn>;

  // Mock imports
  const mockIsVersionAtLeast = vi.mocked(isVersionAtLeast);
  const mockError = vi.mocked(error);

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock client with GET method
    mockClient = {
      GET: vi.fn(),
    } as any;

    mockShutdown = vi.fn();
    authErrorHandler = AuthErrorHandler(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleAuthErrors', () => {
    it('should handle unauthenticated error when server version is supported', async () => {
      // Mock server version response
      mockClient.GET = vi.fn().mockResolvedValue({
        response: {
          headers: {
            get: vi.fn().mockReturnValue('3.143.0'),
          },
        },
      });

      // Mock version check to return supported
      mockIsVersionAtLeast.mockReturnValue(true);

      const error = {
        headers: {
          message: 'Unauthenticated',
        },
      };

      await authErrorHandler.handleAuthErrors(error, mockShutdown);

      // Verify server version was checked
      expect(mockClient.GET).toHaveBeenCalledWith('/api/public/configuration');
      expect(mockIsVersionAtLeast).toHaveBeenCalledWith('3.143.0', '3.143.0');
      expect(mockError).toHaveBeenCalledWith(
        "You're not authenticated. Invalid API key?"
      );
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle unauthenticated error when server version is not supported', async () => {
      const unsupportedVersion = '3.142.0';

      // Mock server version response
      mockClient.GET = vi.fn().mockResolvedValue({
        response: {
          headers: {
            get: vi.fn().mockReturnValue(unsupportedVersion),
          },
        },
      });

      // Mock version check to return not supported
      mockIsVersionAtLeast.mockReturnValue(false);

      const error = {
        headers: {
          message: 'Unauthenticated',
        },
      };

      await authErrorHandler.handleAuthErrors(error, mockShutdown);

      // Verify server version was checked
      expect(mockClient.GET).toHaveBeenCalledWith('/api/public/configuration');
      expect(mockIsVersionAtLeast).toHaveBeenCalledWith(
        '3.143.0',
        unsupportedVersion
      );
      expect(mockError).toHaveBeenCalledWith(
        `Server version ${unsupportedVersion} does not support CLI watch mode. Please update your Tolgee server to version 3.143.0 or higher.`
      );
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle unauthenticated error when server version cannot be determined', async () => {
      // Mock server version request failure
      mockClient.GET = vi.fn().mockRejectedValue(new Error('Network error'));

      const error = {
        headers: {
          message: 'Unauthenticated',
        },
      };

      await authErrorHandler.handleAuthErrors(error, mockShutdown);

      // Verify server version check was attempted
      expect(mockClient.GET).toHaveBeenCalledWith('/api/public/configuration');
      expect(mockError).toHaveBeenCalledWith(
        'Server version null does not support CLI watch mode. Please update your Tolgee server to version 3.143.0 or higher.'
      );
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle unauthenticated error when server version header is missing', async () => {
      // Mock server version response with no version header
      mockClient.GET = vi.fn().mockResolvedValue({
        response: {
          headers: {
            get: vi.fn().mockReturnValue(null),
          },
        },
      });

      const error = {
        headers: {
          message: 'Unauthenticated',
        },
      };

      await authErrorHandler.handleAuthErrors(error, mockShutdown);

      // Verify server version was checked
      expect(mockClient.GET).toHaveBeenCalledWith('/api/public/configuration');
      expect(mockError).toHaveBeenCalledWith(
        'Server version null does not support CLI watch mode. Please update your Tolgee server to version 3.143.0 or higher.'
      );
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle unauthorized error without version checking', async () => {
      const error = {
        headers: {
          message: 'Forbidden',
        },
      };

      await authErrorHandler.handleAuthErrors(error, mockShutdown);

      // Verify no server version check was made for unauthorized errors
      expect(mockClient.GET).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith(
        "You're not authorized. Insufficient permissions?"
      );
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle edge case with different server versions', async () => {
      const testCases = [
        { version: 'v3.143.0', expected: true },
        { version: '3.144.0', expected: true },
        { version: '4.0.0', expected: true },
        { version: '3.142.9', expected: false },
        { version: '3.0.0', expected: false },
        { version: '??', expected: true }, // local build
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        // Mock server version response
        mockClient.GET = vi.fn().mockResolvedValue({
          response: {
            headers: {
              get: vi.fn().mockReturnValue(testCase.version),
            },
          },
        });

        // Mock version check
        mockIsVersionAtLeast.mockReturnValue(testCase.expected);

        const error = {
          headers: {
            message: 'Unauthenticated',
          },
        };

        await authErrorHandler.handleAuthErrors(error, mockShutdown);

        expect(mockIsVersionAtLeast).toHaveBeenCalledWith(
          '3.143.0',
          testCase.version
        );

        if (testCase.expected) {
          expect(mockError).toHaveBeenCalledWith(
            "You're not authenticated. Invalid API key?"
          );
        } else {
          expect(mockError).toHaveBeenCalledWith(
            `Server version ${testCase.version} does not support CLI watch mode. Please update your Tolgee server to version 3.143.0 or higher.`
          );
        }
      }
    });
  });
});
