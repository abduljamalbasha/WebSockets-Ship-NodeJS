var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io-client');
var config = require('./config/config');
var socket = io.connect(config.URL);
var klaw = require('klaw-sync');
var rimraf = require('rimraf');
var splitFile = require('split-file');
var sizeOf = require('object-sizeof');
var chokidar = require('chokidar');
var { logger } = require('./utils/logger');
var { logging } = require('./utils/logs');
var uuid = require('uuid/v5');
var moment = require('moment');

app.use(bodyParser.json());
app.use(cors());

var fileIndex = 0;

socket.on(config.connect, () => {
  logger.info(config.clientId + " has connected to the Server");
  socket.emit('clientName', { clientId: config.clientId, clientName: "Vessel" }, (value) => {
    console.log("Connected to Server");

  })
  socket.emit(config.shipReadyToSend, { ready: config.shipReadyToSendValue }, (value) => {
    if (true === value) {
      readDirectory(config.filesFromClient, config.sendDirectory);
      setInterval(() => {
        readDirectory(config.filesFromClient, config.sendDirectory);
      }, 15000)
    }
  });

  socket.emit(config.shipReadyToReceive, { ready: config.shipReadyToReceiveValue, clientId: config.clientId });

  socket.on(config.disconnect, () => {
    console.log("Socket has been disconnected", new Date().toLocaleString());
  });
});

function readDirectory(nspName, folderPath) {
  const files = klaw(folderPath, { nodir: true });
  fileIndex = 0;
  if (files.length !== 0)
    transportFile(nspName, files, files.length);
}

async function transportFile(nspName, files, fileCount) {
  var url = files[fileIndex].path;
  var folderArr = url.split('\\');
  var fileName = folderArr[folderArr.length - 1];
  try {
    fs.exists(url, (exists) => {
      if (exists) {
        var data = fs.readFileSync(url);
        var buff = Buffer.from(data);
        var startTime = moment(new Date(), 'DD-MMM-YYYY, HH:mm:ss').utc();
        logging(fileName, config.clientId, 'server', config.clientId, 'Shore', url);
        socket.emit(nspName, {
          fileName: fileName, fileContent: buff, sourceId: config.clientId, destinationId: config.vessel1, timeInitated: moment(new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Calcutta'
          })).utc().format('DD-MM-YYYY, HH:mm:ss').toString()
        }, (value) => {
          logger.info("ACK - " + value);
          var endTime = moment(new Date(), 'DD-MMM-YYYY, HH:mm:ss').utc();
          var secondsDifference = endTime.diff(startTime, 'seconds');
          var milliseconds = endTime.diff(startTime, 'milliseconds');
          logger.info(secondsDifference + 's ' + milliseconds + 'ms taken for ' + fileName);
          console.log(moment(new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Calcutta'
          })).utc().format('DD-MM-YYYY, HH:mm:ss SSS'));
          fs.unlink(url, (err) => {
            if (err) {
              logger.error(err);
            } else {
              if (fileIndex < fileCount - 1) {
                setTimeout(() => {
                  fileIndex++;
                  transportFile(nspName, files, fileCount);
                }, 1000)
              }
            }
          })
        });
      }
    })
  } catch (error) {
    console.log('error: ', error);
  }
}

socket.on(config.filesToClient, async (message, callback) => {
  try {
    var fileName = message.fileName;
    var fileContent = Buffer.from(message.fileContent);
    fs.writeFileSync(config.receiveDirectory + fileName, fileContent);
    logger.info(uuid(fileName, config.uuid) + " - " + config.clientId + " has received " + message.fileName + " sent from Shore");
    callback(uuid(fileName, config.uuid) + " - " + config.clientId + " has received " + message.fileName + " sent from Shore");
  } catch (error) {
    console.log('error: ', error);
  }
});


async function directoryExists(folderPath) {
  try {
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath);
  } catch (error) {
    console.log('error: ', error);
  }
}

server.listen(config.port, () => {
  logger.info(`Server is up in port ${config.port}`);
});