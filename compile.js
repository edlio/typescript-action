const ts = require('typescript')
const fs = require('fs')
const request = require('./request')

const { GITHUB_WORKFLOW, GITHUB_SHA, GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_WORKSPACE } = process.env
const event = require(GITHUB_EVENT_PATH)

const { repository } = event
const {
  owner: { login: owner }
} = repository
const { name: repo } = repository

const jsconfig = require(`${GITHUB_WORKSPACE}/jsconfig.json`)

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github.antiope-preview+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'eslint-action'
}

async function createCheck() {
  const body = {
    name: GITHUB_WORKFLOW,
    head_sha: GITHUB_SHA,
    status: 'in_progress',
    started_at: new Date()
  }

  const { data } = await request(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
    method: 'POST',
    headers,
    body
  })

  return data.id
}

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

  const annotations = []
  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );

      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );

      const path = diagnostic.file.fileName.replace(GITHUB_WORKSPACE+"/", '')

      console.log(`${path} (${line + 1},${character + 1}): ${message}`);

      annotations.push({
        path,
        start_line: line + 1,
        end_line: line + 1,
        annotation_level: 'failure',
        message: `${message}`
      })
    } else {
      // console.log( `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  });

  return {
    conclusion: emitResult.emitSkipped > 0 ? 'failure' : 'success',
    output: {
      title: GITHUB_WORKFLOW,
      summary: `${annotations.length} error(s) found`,
      annotations
    }
  }
}

async function updateCheck(id, conclusion, output) {
  if (output) {
    output.annotations = output.annotations.slice(0, 50)
  }

  const body = {
    name: GITHUB_WORKFLOW,
    head_sha: GITHUB_SHA,
    status: 'completed',
    completed_at: new Date(),
    conclusion,
    output
  }

  await request(`https://api.github.com/repos/${owner}/${repo}/check-runs/${id}`, {
    method: 'PATCH',
    headers,
    body
  })
}

function exitWithError(err) {
  console.error('Error', err.stack)
  if (err.data) {
    console.error(err.data)
  }
  process.exit(1)
}

async function run() {
  const id = await createCheck()
  try {
    const files = getFiles('.')
    const { conclusion, output } = compile(files, jsconfig.compilerOptions);

    console.log(output.summary)

    await updateCheck(id, conclusion, output)
    if (conclusion === 'failure') {
      process.exit(78)
    }
  } catch (err) {
    await updateCheck(id, 'failure')
    exitWithError(err)
  }
}

run().catch(exitWithError)
