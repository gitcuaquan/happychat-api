import BaseRepository from "./base.repository.js";
import SocialAccount from "../models/socialAccount.model.js";

class SocialAccountRepository extends BaseRepository {
  constructor() {
    super(SocialAccount);
  }
}

export default new SocialAccountRepository();
