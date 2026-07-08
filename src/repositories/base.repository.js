/**
 * Base Repository cho các thao tác CRUD cơ bản với MongoDB.
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Tạo một document mới
   * @param {Object} data - Dữ liệu của document
   * @returns {Promise<Document>}
   */
  async create(data) {
    return await this.model.create(data);
  }

  /**
   * Tìm document theo ID
   * @param {String} id - ID của document
   * @param {String} select - Các trường muốn lấy (tùy chọn)
   * @returns {Promise<Document>}
   */
  async findById(id, select = '') {
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    return await query.exec();
  }

  /**
   * Tìm một document duy nhất theo điều kiện
   * @param {Object} conditions - Điều kiện truy vấn
   * @param {String} select - Các trường muốn lấy (tùy chọn)
   * @returns {Promise<Document>}
   */
  async findOne(conditions, select = '') {
    let query = this.model.findOne(conditions);
    if (select) query = query.select(select);
    return await query.exec();
  }

  /**
   * Tìm nhiều documents theo điều kiện
   * @param {Object} conditions - Điều kiện truy vấn
   * @param {String} select - Các trường muốn lấy (tùy chọn)
   * @returns {Promise<Array<Document>>}
   */
  async find(conditions = {}, select = '') {
    let query = this.model.find(conditions);
    if (select) query = query.select(select);
    return await query.exec();
  }

  /**
   * Cập nhật một document theo ID
   * @param {String} id - ID của document
   * @param {Object} data - Dữ liệu cần cập nhật
   * @returns {Promise<Document>}
   */
  async updateById(id, data) {
    return await this.model.findByIdAndUpdate(id, data, {
      new: true, // Trả về document sau khi đã cập nhật
      runValidators: true, // Chạy các rules validation của schema
    });
  }

  /**
   * Xóa một document theo ID
   * @param {String} id - ID của document
   * @returns {Promise<Document>}
   */
  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Lấy danh sách có phân trang
   * @param {Object} conditions - Điều kiện truy vấn
   * @param {Number} page - Trang hiện tại (mặc định 1)
   * @param {Number} limit - Số lượng trên mỗi trang (mặc định 10)
   * @param {String} select - Các trường muốn lấy (tùy chọn)
   * @param {Object} sort - Điều kiện sắp xếp (tùy chọn)
   * @returns {Promise<Object>} Trả về object chứa data và metadata phân trang
   */
  async findPaginated(conditions = {}, page = 1, limit = 10, select = '', sort = { createdAt: -1 }) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.find(conditions).select(select).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(conditions)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      metadata: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
}

export default BaseRepository;
