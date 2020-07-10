'use strict';

const DEFAULT_JS_EXTENSIONS = 'js,ts';

function getTransformPath(binRoot, transformName) {
  const path = require('path');

  return path.join(binRoot, '..', 'transforms', transformName, 'index.js');
}

async function runJsTransform(binRoot, transformName, args, extensions = DEFAULT_JS_EXTENSIONS) {
  const globby = require('globby');
  const execa = require('execa');
  const chalk = require('chalk');
  const path = require('path');
  const { parseTransformArgs } = require('./options-support');

  let { paths, options } = parseTransformArgs(args);

  try {
    let foundPaths = await globby(paths, {
      expandDirectories: { extensions: extensions.split(',') },
    });
    let transformPath = getTransformPath(binRoot, transformName);

    let jscodeshiftPkg = require('jscodeshift/package');
    let jscodeshiftPath = path.dirname(require.resolve('jscodeshift/package'));
    let binPath = path.join(jscodeshiftPath, jscodeshiftPkg.bin.jscodeshift);

    let binOptions = ['-t', transformPath, '--extensions', extensions, ...foundPaths];

    return execa(binPath, binOptions, {
      stdio: 'inherit',
      env: {
        CODEMOD_CLI_ARGS: JSON.stringify(options),
      },
    });
  } catch (error) {
    console.error(chalk.red(error.stack)); // eslint-disable-line no-console
    process.exitCode = 1;

    throw error;
  }
}

async function runTemplateTransform(binRoot, transformName, args) {
  const execa = require('execa');
  const chalk = require('chalk');
  const { parseTransformArgs } = require('./options-support');

  let { paths, options } = parseTransformArgs(args);

  try {
    let transformPath = getTransformPath(binRoot, transformName);
    let binOptions = ['-t', transformPath, ...paths];

    return execa('ember-template-recast', binOptions, {
      stdio: 'inherit',
      preferLocal: true,
      env: {
        CODEMOD_CLI_ARGS: JSON.stringify(options),
      },
    });
  } catch (error) {
    console.error(chalk.red(error.stack)); // eslint-disable-line no-console
    process.exitCode = 1;

    throw error;
  }
}

async function runTransform(binRoot, transformName, args, extensions) {
  const { getTransformType } = require('./transform-support');

  let transformPath = getTransformPath(binRoot, transformName);
  let type = getTransformType(transformPath);

  switch (type) {
    case 'js':
      return runJsTransform(binRoot, transformName, args, extensions);
    case 'hbs':
      return runTemplateTransform(binRoot, transformName, args);
    default:
      throw new Error(`Unknown type passed to runTransform: "${type}"`);
  }
}

module.exports = {
  runTransform,
};
