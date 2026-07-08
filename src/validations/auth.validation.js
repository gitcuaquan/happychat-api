import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(6).max(32).required().messages({
    "string.empty": "Username không được để trống",
    "string.min": "Username phải có ít nhất 6 ký tự",
    "string.max": "Username không được vượt quá 32 ký tự",
    "string.alphanum": "Username chỉ được chứa chữ cái và số",
    "any.required": "Trường username là bắt buộc",
  }),
  password: Joi.string().min(8).max(32).required().messages({
    "string.empty": "Password không được để trống",
    "string.min": "Password phải có ít nhất 8 ký tự",
    "string.max": "Password không được vượt quá 32 ký tự",
    "any.required": "Trường password là bắt buộc",
  }),
  fullName: Joi.string().min(2).max(32).messages({
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.max": "Họ tên không được vượt quá 32 ký tự",
  }),
});

export const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "string.empty": "Username không được để trống",
    "any.required": "Trường username là bắt buộc",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password không được để trống",
    "any.required": "Trường password là bắt buộc",
  }),
});
