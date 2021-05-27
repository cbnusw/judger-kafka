const fs = require("fs");
const path = require("path");

const judger = require("/Judger/bindings/NodeJS");
var base = require("./base.js");
const { Submit, Problem } = require('./models/@main');
const { OUTPUT_PATH } = require("./env");

const startJudge = async (submitId) => {
    let config = base.baseconfig();

    config["sumbit_id"] = submitId;
    const submit = Submit.findOne({ _id: submitId })

    if (!sumbit)
        return;

    config["language"] = submit.language;
    config["code_name"] = sumbit.source;

    switch (config["language"]) {
        case "c":
            config["exe_path"] = base.compile_c(config["code_name"]);
            break;
        case "c++":
            config["exe_path"] = base.compile_cpp(config["code_name"]);
            break;
        case "python2":
            config["exe_path"] = "/usr/bin/python";
            config["args"] = [path.join(base.code_base_path, config["code_name"])];
            break;
        case "python3":
            config["exe_path"] = "/usr/bin/python3";
            config["args"] = [path.join(base.code_base_path, config["code_name"])];
            break;
        case "java":
            config["exe_path"] = "/usr/bin/java";
            config["args"] = `-cp ${base.code_base_path} -Djava.security.manager -Dfile.encoding=UTF-8 -Djava.security.policy==/etc/java_policy -Djava.awt.headless=true ${base.compile_java(config["code_name"])}`.split(" ");
            config["memory_limit_check_only"] = 1;
            break;
        case "kotlin":
            config["exe_path"] = "/usr/bin/java";
            config["args"] = `-cp ${base.code_base_path} -Djava.security.manager -Dfile.encoding=UTF-8 -Djava.security.policy==/etc/java_policy -Djava.awt.headless=true ${base.compile_kotlin(config["code_name"])}`.split(" ");
            config["memory_limit_check_only"] = 1;
            break;
        case "go":
            config["exe_path"] = base.compile_go(config["code_name"]);
            config["memory_limit_check_only"] = 1;
            break;
    }

    const result = await judge(config);

    const type = ['done', 'timeout', 'timeout', 'memory', 'runtime', 'fail'];
    await Submit.update(
        { '_id': submitId },
        {
            '$set':
            {
                'res': {
                    type: type[result['type']],
                    memory: result['memory'],
                    time: reulst['real_time']
                }
            }
        });

    return result;
}

const judge = async (config) => {
    const problem = Problem.findOne({ _id: sumbit.problem })
    const ioSet = problem.ioSet;

    let result = { 'memory': 0, 'real_time': 0 };

    for (const io of ioSet) {
        const fileName = file.substring(0, file.lastIndexOf("."));
        config["input_path"] = io.inFile; // todo 연결된 볼륨 주소로 치환
        config["answer_path"] = io.outFile; // todo 연결된 볼륨 주소로 치환
        config["output_path"] = path.join(OUTPUT_PATH, `${config["sumbit_id"]}_${fileName}.out`);

        const judger_result = await judger.run(config);

        const answer = base.read_file(config["answer_path"]);
        const output = base.read_file(config["output_path"]);

        result['type'] = judger_result["result"];

        if (result['memory'] > judger_result["memory"])
            result['memory'] = judger_result["memory"];

        if (result['real_time'] > judger_result["real_time"])
            result['real_time'] = judger_result["real_time"];

        if (judger_result["result"] != judger.RESULT_SUCCESS)
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
