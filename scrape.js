var cheerio = require('cheerio');
var request = require('request');
var async = require('async');
var fs = require('fs');

var queue = async.queue(downloadFile, 2); // 2 at once
queue.drain = function() {
  console.log("Done downloading!");
}

function getPage(pageNumber, cb) {
  request('http://simpledesktops.com/browse/' + pageNumber, function(error, response, body) {
    if(error) {
      return cb(error);
    }
    if(response.statusCode == 404) {
      return cb(false);
    }
    var $ = cheerio.load(body);
    var imgs = $(".desktop > a > img");
    for(var i=0;i<imgs.length;i++) {
      var img = imgs[i];
      var title = img.attribs.title;
      var m = img.attribs.src.match(/.*\/uploads\/desktops\/(\d+)\/(\d+)\/(\d+)\/(.*?)\.295x184/);
      if(!m) { console.error("SimpleDesktops changed. We need to be updated"); process.exit(); }
      var downloadUrl = "http://static.simpledesktops.com/uploads/desktops/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4];
      queue.push({url: downloadUrl, title: title});
    }
    getPage(pageNumber+1, cb);
  });
}

function getAllPages(cb) {
  getPage(1, cb);
}

function makeFileName(file) {
  /* Todo, maybe make sure there's no file collisions. 
  Including the date in it should be enough */
  try {
    var m = file.url.match(/.*\/uploads\/desktops\/(\d+)\/(\d+)\/(\d+)\/(.*)(\..+)?/);
    fname = m[1] + "-" + m[2] + "-" + m[3] + " " + file.title + (m.length == 5 ? m[5] : ".png");
  } catch(ex) {
    console.log("Error getting filename for url: " + file.url + "\nUsing " + file.title);
    fname = file.title;
  }
  return fname.replace(/[\~#&%\*:\?\<\>\?\|\/\\\-\[\]]/g, ''); /* Remove several invalid filename chars */
}

function downloadFile(file, callback) {
  console.log("Downloading " + file.title);
  var r = request(file.url).pipe(fs.createWriteStream(makeFileName(file)));
  r.on('finish', callback);
}

getAllPages(function(err) { 
  if(err) return console.log(err); 
});
