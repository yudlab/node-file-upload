const { exec } = require("child_process");
var fs = require("fs");
require('dotenv').config()
const { zipper } = require("./zipper");

function getIPAddress() {
  var interfaces = require("os").networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      )
        return alias.address;
    }
  }
  return "0.0.0.0";
}

const config = {
  libreOfficeExe: process.env.LIBREOFFICE_EXE,
  server_address: `http://${getIPAddress()}:3000`,
};

console.error("Serving web service at: ", config.server_address);

const pathSeparator = (path) => {
  return path.replace(/\\/g, `/`);
};

function execPromise(command) {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(stderr);
        return;
      }

      resolve(stdout);
    });
  });
}

const getZipName = () => {
  var today = new Date();
  var dd = String(today.getDate());
  var mm = String(today.getMonth() + 1); //January is 0!
  var yyyy = today.getFullYear();
  var hh = today.getHours();
  var mm = today.getMinutes();
  var ss = today.getSeconds();

  return `${dd}-${mm}-${yyyy}-${hh}-${mm}-${ss}.zip`;
};

const convertor = (files, paths) => {
  return new Promise(async (resolve) => {
    let resp = {
      linkToZIP: "",
      nb_files: 0,
    };

    if (typeof files !== "object" || files.length === 0) {
      resp.error = true;
      resp.error_message = "An error occured.(files)";
    } else {
      if(files.length > 1) {
        let pdfDestination = pathSeparator(
          process.cwd() + "/storage/uploads/PDFs"
        );
        let zipDestination = pathSeparator(process.cwd() + "/public/zip");
        let zipName = getZipName();
        let fullZipFilename = pathSeparator(zipDestination + "/" + zipName);
        console.log(fullZipFilename);
        for (var i = 0; i < files.length; i++) {
          let fullPath = pathSeparator(
            process.cwd() + "/storage/uploads/" + files[i].filename
          );
          try {
            resp.status = await execPromise(
              `${config.libreOfficeExe} --headless --convert-to pdf --outdir "${pdfDestination}" "${fullPath}"`
            );
            fs.unlinkSync(fullPath); //deletes the file.
            resp.nb_files = resp.nb_files + 1;
          } catch (error) {
            resp.error = true;
            resp.error_message = "An error occured: " + error;
          }
        }
        await zipper(pdfDestination, fullZipFilename);
        resp.linkToZIP = pathSeparator(config.server_address + "/zip/" + zipName);
        fs.rmSync(pdfDestination, { recursive: true, force: true });
      }
    }
    resolve(resp);
  });
};

module.exports = convertor;
