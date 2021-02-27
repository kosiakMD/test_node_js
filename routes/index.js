var express = require('express');
var { performance, PerformanceObserver } = require('perf_hooks');
var router = express.Router();
var { getData } = require('../modules/getSource');
var logHelper = require('../helper/logHelper');

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
})

perfObserver.observe({ entryTypes: ["measure"], buffer: true })

/* GET home page. */
router.get('/', function (req, res, next) {

  try {
    const successCallback = (string, startTime, ) => {
      const requestTime = new Date() - startTime;
      // performance.mark('request-end')
      // performance.measure('request', 'request-start', 'request-end')
      console.info('success');
      console.log('diff', requestTime);
      // console.timeEnd('time')
      // const times = logHelper.getLogTimes();
      const logs = logHelper.logs;
      // console.log('logs', logs);
      let changes = { [logHelper.Logs.characters]: string.length };

      const { [logHelper.Logs.distribution]: distribution } = logs;
      // console.log('distribution', typeof distribution);
      for (let i = 0, length = string.length; i < length; ++i) {
        const ch = string.charAt(i);
        let count;
        if (distribution.has(ch)) {
          count = distribution.get(ch) + 1;
        } else {
          count = 1;
        }
        distribution.set(ch, count);
      }
      changes[logHelper.Logs.distribution] = distribution;

      if (string.length > logs[logHelper.Logs.longestString]) {
        changes[logHelper.Logs.longestString] = string.length;
      }
      const maxTime = logs[logHelper.LogTimes.maxTime];
      if (!maxTime || maxTime < requestTime) {
        changes[logHelper.LogTimes.maxTime] = requestTime;
      }
      const minTime = logs[logHelper.LogTimes.minTime];
      if (!minTime || minTime > requestTime) {
        changes[logHelper.LogTimes.minTime] = requestTime;
      }

      // if times changed
      if (changes.maxTime || changes.minTime) {
        changes[logHelper.LogTimes.averageTime] = Math.round((maxTime + minTime) / 2);
      }
      logHelper.updateLogFile(changes)
        .catch((e) => console.error('Success Logs are not saved:\n' + e));
      res.write(string);
    };

    const retry = () => {
      console.warn('retry', logHelper.logs.retry, logHelper.logs.retry + 1);
      logHelper.updateLogFile({ [logHelper.Logs.retry]: logHelper.logs.retry + 1 })
        .catch((e) => console.error('Retry Logs are not saved:\n' + e));
      const startTime = new Date();
      getData((result) => successCallback(result, startTime), retry);
    };
    // performance.mark('request-start')
    // console.time('time')
    const startTime = new Date();
    getData((result) => successCallback(result, startTime), retry);

  } catch (e) {
    console.error(e);
    res.error(e);
  }
});

module.exports = router;
