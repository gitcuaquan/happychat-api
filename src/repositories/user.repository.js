import BaseRepository from './base.repository.js';
import User from '../models/user.model.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User); // Truyền model User của Mongoose vào BaseRepository
  }

  /**
   * Hàm tùy chỉnh để tìm user theo username và bắt buộc lấy cả trường password
   * @param {String} username 
   * @returns {Promise<Document>}
   */
  async findByUsernameWithPassword(username) {
    return await this.model.findOne({ username }).select('+password');
  }
}

// Export một instance duy nhất (Singleton pattern)
export default new UserRepository();
