var fs = require('fs');
var util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
// const exists = util.promisify(fs.exists);
// const appendFile = util.promisify(fs.appendFile);

function omit(keys, obj) {
  if (!keys.length) return obj;
  const { [keys.pop()]: omitted, ...rest } = obj;
  return omit(keys, rest);
}

class LogHelper {
  LogTimes = {
    minTime: 'minTime',
    maxTime: 'maxTime',
    averageTime: 'averageTime',
  };

  Logs = {
    retry: 'retry',
    characters: 'characters',
    longestString: 'longestString',
    distribution: 'distribution',
    ...this.LogTimes,
  };

  constructor(path) {
    this.path = path;
    const isFile = fs.existsSync(path);

    if (!isFile) {
      this._logs = this.getDefaults();
      this.creatLogFileAsync();
    } else {
      this._logs = this.getFileLogsSync();
    }

    process.on('exit', (code) => {
      console.log(`About to exit with code ${code}`);
      return this.updateLogFile({});
    });
  }

  _replaceLogs = (logs) => this._logs = logs;

  get logs() {
    return this._logs;
  };

  set logs(values) {
    throw new Error('no rights to update');
  }

  getDefaults = () => {
    const logValues = {};
    Object.values(this.Logs).forEach((key) => {
      if (key === this.Logs.distribution) {
        logValues[key] = new Map();
      } else {
        logValues[key] = 0;
      }
    });
    return logValues;
  };

  addDistribution = (data, empty = false) => {
    const { [this.Logs.distribution]: distribution } = data;
    return {
      ...data,
      [this.Logs.distribution]: distribution ? new Map(distribution) : empty ? [] : new Map(),
    };
  };

  setDistribution = (data) => {
    return {
    ...data,
      [this.Logs.distribution]: [...data[this.Logs.distribution]],
    }
  };

  getFileLogsSync = () => {
    const file = fs.readFileSync(path, 'utf8');
    const parsed = JSON.parse(file);
    const { [this.Logs.distribution]: distribution } = parsed;
    return this.addDistribution(parsed);
  };

  getFileLogs = async () => {
    const file = await readFile(path, 'utf8');
    const parsed = JSON.parse(file);
    const { [this.Logs.distribution]: distribution } = parsed;
    return this.addDistribution(parsed);
  };

  creatLogFileAsync = () => fs.appendFileSync(
    this.path,
    JSON.stringify(this.setDistribution(this.logs)),
    'utf8',
  );

  updateLogFile = async (updateObject) => {
    let file = await readFile(path, 'utf8');
    const parsed = JSON.parse(file);
    const dataObject = this.addDistribution(parsed);
    this._replaceLogs({ ...dataObject, ...updateObject });
    file = JSON.stringify(this.setDistribution(this.logs));
    return writeFile(path, file, 'utf8');
  };

  getLogTimes() {
    return omit(Object.values(this.LogTimes), this.logs);
  }

}

const path = __dirname + '/../logs.txt';
const logHelper = new LogHelper(path);

module.exports = logHelper;
