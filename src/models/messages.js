import Joi from "joi";

const regex = /^(message|private_message)$/;
export const messageSchema = Joi.object({
  to: Joi.string().min(1).max(25).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().regex(regex).required(),
});
