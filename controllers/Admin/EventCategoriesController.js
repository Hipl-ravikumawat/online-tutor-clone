const EventCategory = require("../../models/EventCategory");

module.exports = {
  store,
  edit,
};

/**
 * store new event category.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
    try{
        let categoryId = req.body.category_id;
        if(categoryId !==''){
            let categories = await EventCategory.findByIdAndUpdate(categoryId, req.body);
            if(categories){
                req.flash("success", "The Category is updated successfully!");
                res.status(200).json({ "success": true, "message": "The Category is updated successfully!", "redirectUrl": "/calendar/preferences" });    
            }else{
                req.flash("error", "Sorry! Category is not updated");
                res.status(200).json({ "success": false, "message": "Sorry! Category is not updated", "redirectUrl": "/calendar/preferences" });    
            }
        }else{
            let categories = await EventCategory.create(req.body);
            if(categories){
                req.flash("success", "The Category is added successfully!");
                res.status(200).json({ "success": true, "message": "The Category is added successfully!", "redirectUrl": "/calendar/preferences" });    
            }else{
                req.flash("error", "Sorry! Category is not added");
                res.status(200).json({ "success": false, "message": "Sorry! Category is not added", "redirectUrl": "/calendar/preferences" });    
            }
        }
    }catch(error){
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * edit event category.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
    try{
        const categories = await EventCategory.findById(req.body.category_id); 
        res.send(categories);
    }catch(error){
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}