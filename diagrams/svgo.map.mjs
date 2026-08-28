export default {
  multipass: true,
  plugins: [
    { name: 'preset-default', params: { overrides: {
      // the generator already emits integer coordinates. letting svgo round
      // again collapsed every short residential street to an empty path and
      // the cleanup plugins then deleted 31,443 of them.
      convertPathData: false,
      removeHiddenElems: false,
      cleanupIds: false,      // ids are the hover hooks
      inlineStyles: false,    // would flatten the :hover rules
      minifyStyles: false,
      removeViewBox: false,
      // mergePaths is the real win here: 31k same-styled paths become a few
      mergePaths: { force: true, noSpaceAfterFlags: true },
    } } },
  ],
};
