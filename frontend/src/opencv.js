let openCvPromise;

export function getOpenCv() {
  if (!openCvPromise) {
    openCvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
      if (cvModule instanceof Promise) {
        return cvModule;
      }

      if (cvModule.Mat) {
        return cvModule;
      }

      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error('OpenCV.js initialization timed out.')),
          30000
        );
        const previousInitialized = cvModule.onRuntimeInitialized;
        const previousAbort = cvModule.onAbort;

        cvModule.onRuntimeInitialized = () => {
          window.clearTimeout(timeout);
          previousInitialized?.();
          resolve();
        };
        cvModule.onAbort = (reason) => {
          window.clearTimeout(timeout);
          previousAbort?.(reason);
          reject(new Error(`OpenCV.js failed to initialize: ${reason || 'unknown error'}`));
        };
      });

      return cvModule;
    }).catch((error) => {
      openCvPromise = undefined;
      throw error;
    });
  }

  return openCvPromise;
}
