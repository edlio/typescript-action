const ts = require('typescript')
const fs = require('fs')

const { GITHUB_WORKSPACE } = process.env

const jsconfig = require(`${GITHUB_WORKSPACE}/jsconfig.json`)

/**
 * Returns all files within the folder excep . folders and node_modules
 *
 * @param {string} dir
 * @param {string[]=} files_
 * @returns {string[]}
 */
function getFiles(dir, files_ = []) {
  const files = fs.readdirSync(dir);

  for (var i in files){
    const name = dir + '/' + files[i];
    // Don't go into hidden folders such as .git
    if (fs.statSync(name).isDirectory() && !name.includes('/.')){
      getFiles(name, files_);
    // don't include non-js files and skip node_modules
    } else if (name.endsWith('.js') && !name.includes('node_modules') ) {
      files_.push(name);
    }
  }

  return files_;
}

/**
 * @param {string[]} fileNames
 * @param {Object} options
 */
function compile(fileNames, options) {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      // console.log( `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  });

  const exitCode = emitResult.emitSkipped ? 1 : 0;
  process.exit(exitCode);
}

compile(getFiles('.'), jsconfig.compilerOptions);
