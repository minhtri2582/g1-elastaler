import express from 'express';
import Logger from './common/logger';
import config from './common/config';
import path from 'path';
import FileSystem from './common/file_system';
import { listen } from './common/websocket';
import setupRouter from './routes/route_setup';
import ProcessController from './controllers/process';
import RulesController from './controllers/rules';
import TemplatesController from './controllers/templates';
import FoldersController from './controllers/folders';
import TestController from './controllers/test';
import SilenceController from './controllers/silence';
import ConfigController from './controllers/config';
import cors from 'cors';

let logger = new Logger('Server');

export default class ElastalertServer {
  constructor() {
    this._express = express();
    this._runningTimeouts = [];
    this._processController = null;
    this._rulesController = null;
    this._templatesController = null;
    this._foldersController = null;
    this._configController = null;

    // Set listener on process exit (SIGINT == ^C)
    process.on('SIGINT', () => {
      process.exit(0);
    });

    process.on('exit', () => {
      logger.info('Stopping server');
      this.stop();
      logger.info('Server stopped. Bye!');
    });
  }

  get express() {
    return this._express;
  }

  get processController() {
    return this._processController;
  }

  get rulesController() {
    return this._rulesController;
  }

  get templatesController() {
    return this._templatesController;
  }

  get foldersController() {
    return this._foldersController;
  }

  get testController() {
    return this._testController;
  }

  get silenceController() {
    return this._silenceController;
  }

  get configController() {
    return this._configController;
  }

  start() {
    const self = this;

    // Start the server when the config is loaded
    config.ready(function () {
      try {
        self._express.use(cors());
        self._express.use(express.json());
        self._express.use(express.urlencoded({ extended: true }));
        self._setupRouter();
        self._runningServer = self.express.listen(config.get('port'), self._serverController);
        self._express.set('server', self);

        self._fileSystemController = new FileSystem();
        self._processController = new ProcessController();
        self._processController.start();
        self._processController.onExit(function() {
          // If the elastalert process exits, we should stop the server.
          process.exit(0);
        });

        self._rulesController = new RulesController();
        self._templatesController = new TemplatesController();
        self._foldersController = new FoldersController();
        self._testController = new TestController(self);
        self._silenceController = new SilenceController(self);
        self._configController = new ConfigController(self);

        self._fileSystemController.createDirectoryIfNotExists(self.getDataFolder()).catch(function (error) {
          logger.error('Error creating data folder with error:', error);
        });
        
        logger.info('Server listening on port ' + config.get('port'));

        let wss = listen(config.get('wsport'));

        wss.on('connection', ws => {
          ws.on('message', (data) => {
            try {
              data = JSON.parse(data);
              if (data.rule) {
                let rule = data.rule;
                let options = data.options;
                self._testController.testRule(rule, options, ws);
              }
            } catch (error) {
              console.log(error);
            }
          });
        });

        logger.info('Websocket listening on port 3333');
      } catch (error) {
        logger.error('Starting server failed with error:', error);
        process.exit(1);
      }
    });
  }

  stop() {
    this._processController.stop();
    this._runningServer ? this._runningServer.close() : null;
    this._runningTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  // getDataFolder() {
  //   const dataFolderSettings = config.get('dataPath');

  //   if (dataFolderSettings.relative) {
  //     return path.join(config.get('elastalertPath'), dataFolderSettings.path);
  //   } else {
  //     return dataFolderSettings.path;
  //   }
  // }
  
  _setupRouter() {
    setupRouter(this._express);
  }

  _serverController() {
    logger.info('Server started');
  }
}

  const express = require('express');
  const fs = require('fs');
  const path = require('path');

  const app = express();
  const port = 3000;

  // Hàm đệ quy để lấy toàn bộ cấu trúc thư mục
  function readDirectoryRecursively(directoryPath) {
    const files = fs.readdirSync(directoryPath);
    let result = [];

    files.forEach(file => {
      const filePath = path.join(directoryPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Nếu là thư mục, đọc nó đệ quy
        result = result.concat(readDirectoryRecursively(filePath));
      } else {
        // Nếu là tệp, thêm vào danh sách
        result.push(filePath);
      }
    });

    return result;
  }

  // Định nghĩa một route để lấy toàn bộ cấu trúc thư mục
  app.get('dataPath', (req, res) => {
    const dataFolderPath = getDataFolderPath();
    
    try {
      const allFiles = readDirectoryRecursively(dataFolderPath);

      // Gửi danh sách tất cả các tệp trong thư mục (bao gồm thư mục con) dưới dạng JSON
      res.json({ files: allFiles });
    } catch (err) {
      console.error('Lỗi khi đọc cấu trúc thư mục:', err);
      res.status(500).send('Lỗi máy chủ nội bộ');
    }
  });

  // Hàm lấy đường dẫn thư mục dữ liệu (tương tự như trước)
  function getDataFolderPath() {
    const config = require('module-cua-ban');
    const dataFolderSettings = config.get('dataPath');

    if (dataFolderSettings.relative) {
      return path.join(config.get('elastalertPath'), dataFolderSettings.path);
    } else {
      return dataFolderSettings.path;
    }
  }

  app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại http://localhost:3030`);
  });





// //BACKUP code//
// import express from 'express';
// import Logger from './common/logger';
// import config from './common/config';
// import path from 'path';
// import FileSystem from './common/file_system';
// import { listen } from './common/websocket';
// import setupRouter from './routes/route_setup';
// import ProcessController from './controllers/process';
// import RulesController from './controllers/rules';
// import TemplatesController from './controllers/templates';
// import FoldersController from './controllers/folders';
// import TestController from './controllers/test';
// import SilenceController from './controllers/silence';
// import ConfigController from './controllers/config';
// import cors from 'cors';

// let logger = new Logger('Server');

// export default class ElastalertServer {
//   constructor() {
//     this._express = express();
//     this._runningTimeouts = [];
//     this._processController = null;
//     this._rulesController = null;
//     this._templatesController = null;
//     this._foldersController = null;
//     this._configController = null;

//     // Set listener on process exit (SIGINT == ^C)
//     process.on('SIGINT', () => {
//       process.exit(0);
//     });

//     process.on('exit', () => {
//       logger.info('Stopping server');
//       this.stop();
//       logger.info('Server stopped. Bye!');
//     });
//   }

//   get express() {
//     return this._express;
//   }

//   get processController() {
//     return this._processController;
//   }

//   get rulesController() {
//     return this._rulesController;
//   }

//   get templatesController() {
//     return this._templatesController;
//   }

//   get foldersController() {
//     return this._foldersController;
//   }

//   get testController() {
//     return this._testController;
//   }

//   get silenceController() {
//     return this._silenceController;
//   }

//   get configController() {
//     return this._configController;
//   }

//   start() {
//     const self = this;

//     // Start the server when the config is loaded
//     config.ready(function () {
//       try {
//         self._express.use(cors());
//         self._express.use(express.json());
//         self._express.use(express.urlencoded({ extended: true }));
//         self._setupRouter();
//         self._runningServer = self.express.listen(config.get('port'), self._serverController);
//         self._express.set('server', self);

//         self._fileSystemController = new FileSystem();
//         self._processController = new ProcessController();
//         self._processController.start();
//         self._processController.onExit(function() {
//           // If the elastalert process exits, we should stop the server.
//           process.exit(0);
//         });

//         self._rulesController = new RulesController();
//         self._templatesController = new TemplatesController();
//         self._foldersController = new FoldersController();
//         self._testController = new TestController(self);
//         self._silenceController = new SilenceController(self);
//         self._configController = new ConfigController(self);

//         self._fileSystemController.createDirectoryIfNotExists(self.getDataFolder()).catch(function (error) {
//           logger.error('Error creating data folder with error:', error);
//         });
        
//         logger.info('Server listening on port ' + config.get('port'));

//         let wss = listen(config.get('wsport'));

//         wss.on('connection', ws => {
//           ws.on('message', (data) => {
//             try {
//               data = JSON.parse(data);
//               if (data.rule) {
//                 let rule = data.rule;
//                 let options = data.options;
//                 self._testController.testRule(rule, options, ws);
//               }
//             } catch (error) {
//               console.log(error);
//             }
//           });
//         });

//         logger.info('Websocket listening on port 3333');
//       } catch (error) {
//         logger.error('Starting server failed with error:', error);
//         process.exit(1);
//       }
//     });
//   }

//   stop() {
//     this._processController.stop();
//     this._runningServer ? this._runningServer.close() : null;
//     this._runningTimeouts.forEach((timeout) => clearTimeout(timeout));
//   }

//   getDataFolder() {
//     const dataFolderSettings = config.get('dataPath');

//     if (dataFolderSettings.relative) {
//       return path.join(config.get('elastalertPath'), dataFolderSettings.path);
//     } else {
//       return dataFolderSettings.path;
//     }
//   }

//   _setupRouter() {
//     setupRouter(this._express);
//   }

//   _serverController() {
//     logger.info('Server started');
//   }
// }
