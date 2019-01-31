var uuid = require('uuid/v5');
var logger = require('./logger').logger;
var config = require('./../config/config');
var fs = require('fs');

function logging(fileName, source, destination, originSource, originDestination, url) {
  fs.stat(url, (err, stats) => {
    var fileSize = stats.size;
    var uuId = uuid(fileName, config.uuid);
    logger.info(JSON.stringify({ uuid: uuId, fileName: fileName, size: (fileSize/1024).toFixed(2) + "KB", Source: source, Destination: destination, OriginSource: originSource, OriginDestination: originDestination }, null, 10));
  })
}

module.exports = { logging }; 