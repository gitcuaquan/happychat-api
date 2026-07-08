/**
 * Trả về response JSON chuẩn (success)
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Thông báo thành công
 * @param {Object|Array} data - Dữ liệu trả về (payload)
 */
export const sendSuccess = (res, statusCode, data = null) => {
  res.status(statusCode).json(data);
};
