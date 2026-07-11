module.exports = {
  index,
  customMessageForm,
};

/**
 * messages index page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    return res.render("../views/admin/messages/index");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * custom message form.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function customMessageForm(req, res) {
  try {
    return res.render("../views/admin/messages/custom_message_form");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}
