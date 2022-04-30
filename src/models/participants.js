import Joi from "joi";

export const participantSchema = Joi.object({
  name: Joi.string().min(1).max(25).required(),
});
