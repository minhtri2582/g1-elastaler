import RouteLogger from '../../routes/route_logger';
const fs = require('fs');
const logger = new RouteLogger('/status/:id*');
const readline = require('readline');

export default async function statusHandler(request, response) {
  const rulename = String(request.params.id);
  
  let status = 'ERROR';
  let result = '';
  let timestamp = new Date().toISOString(); // Lấy thời gian hiện tại
  
  let dirPath = '/opt/elastalert/result_elastalert/';
  let filePath = dirPath + rulename + '.txt';
  
  const regex = /(.*) - INFO/;
  
  if (filePath) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (line.includes(rulename)) {
          result = result + line + "\n"
        }
      }

      const match = result.match(regex);
      if (match) {
        let time = match[1]
        time = time.replace(/,/g, '.');
        let date = new Date(time);
        timestamp = date.toISOString();
        if (result.includes(status) || result.includes('error')) {
          status = 'ERROR';
        } else {
          status = 'READY';
        }
      }

      response.json({
        rulename: rulename,
        status,
        timestamp,
        result
      });

    } catch (error) {
      console.error(`No such Result Elastalert: ${error.message}`);
      result = 'No such Result Elastalert';
      response.json({
        rulename: rulename,
        status: 'ERROR',
        timestamp,
        result
      });
    }
  } else {
    response.json({
      rulename: rulename,
      status: 'ERROR',
      timestamp,
      result: 'File path is not valid'
    });
  }
}
