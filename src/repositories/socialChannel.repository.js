import BaseRepository from "./base.repository.js";
import SocialChannel from "../models/socialChannel.model.js";

class SocialChannelRepository extends BaseRepository {
  constructor() {
    super(SocialChannel);
  }
}

export default new SocialChannelRepository();
