/**
 * Middleware để validate dữ liệu đầu vào sử dụng thư viện Joi
 * @param {Object} schema - Joi schema object
 * @param {String} property - Thuộc tính của req cần validate (thường là 'body', 'query', hoặc 'params')
 */
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    // Gọi hàm validate của Joi
    const { error } = schema.validate(req[property], { abortEarly: false });

    if (error) {
      const errors = {};
      error.details.forEach((detail) => {
        errors[detail.path.join(".")] = detail.message;
      });
      return res.status(400).json(errors);
    }

    // Dữ liệu hợp lệ, cho phép request đi tiếp tới Controller
    next();
  };
};
