const ejs = require('ejs');
const path = require('path');
let render = (data,relativePath) => {
    let html;
    ejs.renderFile(
        path.join(__dirname, '../views/admin/templates', relativePath),
        data,
        function(err, template){
            if (err){console.log('error in rendering template',err); return}
            html = template;
        }
    )
    return html;
  }
module.exports = {
    render: render
}