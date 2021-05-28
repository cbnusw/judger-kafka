// const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const judger = require('/Judger/bindings/NodeJS');
const base = require('./base.js');
const { Submit, Problem } = require('./models/@main');
const { OUTPUT_PATH, CODE_BASE_PATH } = require('./env');

const getBasename = url => path.basename(parse(url).pathname);

const startJudge = async (submitId) => {
  let config = base.baseconfig();

  config['submit_id'] = submitId;
  const submit = await Submit.findById(submitId)

  if (!submit)
    return;

  config['language'] = submit.language;
  config['code_name'] = path.join(CODE_BASE_PATH, getBasename(submit.source));

  switch (config['language']) {
    case 'c':
      config['exe_path'] = base.compile_c(config['code_name']);
      break;
    case 'c++':
      config['exe_path'] = base.compile_cpp(config['code_name']);
      break;
    case 'python2':
      config['exe_path'] = '/usr/bin/python';
      config['args'] = [path.join(base.code_base_path, config['code_name'])];
      break;
    case 'python3':
      config['exe_path'] = '/usr/bin/python3';
      config['args'] = [path.join(base.code_base_path, config['code_name'])];
      break;
    case 'java':
      config['exe_path'] = '/usr/bin/java';
      config['args'] = `-cp ${base.code_base_path} -Djava.security.manager -Dfile.encoding=UTF-8 -Djava.security.policy==/etc/java_policy -Djava.awt.headless=true ${base.compile_java(config['code_name'])}`.split(' ');
      config['memory_limit_check_only'] = 1;
      break;
    case 'kotlin':
      config['exe_path'] = '/usr/bin/java';
      config['args'] = `-cp ${base.code_base_path} -Djava.security.manager -Dfile.encoding=UTF-8 -Djava.security.policy==/etc/java_policy -Djava.awt.headless=true ${base.compile_kotlin(config['code_name'])}`.split(' ');
      config['memory_limit_check_only'] = 1;
      break;
    case 'go':
      config['exe_path'] = base.compile_go(config['code_name']);
      config['memory_limit_check_only'] = 1;
      break;
  }

  const result = await judge(config);

  const type = ['done', 'timeout', 'timeout', 'memory', 'runtime', 'fail'];
  await submit.updateOne({
    $set: {
      result: {
        type: type[result['type']],
        memory: result['memory'],
        time: result['real_time']
      }
    }
  });

  return result;
}

const judge = async (config) => {
  const problem = await Problem.findById(submit.problem)
    .populate({ path: 'ioSet.inFile' })
    .populate({ path: 'ioSet.outFile' });

  const { ioSet } = problem;

  let result = { 'memory': 0, 'real_time': 0 };

  for (const io of ioSet) {
    config['input_path'] = path.join('/io', getBasename(io.inFile.url)); // todo 연결된 볼륨 주소로 치환
    config['answer_path'] = path.join('/io', getBasename(io.outFile.url)); // todo 연결된 볼륨 주소로 치환
    config['output_path'] = path.join(OUTPUT_PATH, `${config['submit_id']}.out`);

    const judgerResult = await judger.run(config);

    const answer = base.read_file(config['answer_path']);
    const output = base.read_file(config['output_path']);

    result['type'] = judgerResult['result'];

    if (result['memory'] > judgerResult['memory'])
      result['memory'] = judgerResult['memory'];

    if (result['real_time'] > judgerResult['real_time'])
      result['real_time'] = judgerResult['real_time'];

    if (judgerResult['result'] != judger.RESULT_SUCCESS)
      break;

    if (answer !== output) {
      result['type'] = judger.RESULT_WRONG_ANSWER;
      break;
    }
  }

  return result;
}

module.exports = {
  startJudge
};
