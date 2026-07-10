import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repository.js";
import socialChannelRepository from "../repositories/socialChannel.repository.js";
import socialAccountRepository from "../repositories/socialAccount.repository.js";
import { config } from "../config/env.js";
import { sendSuccess } from "../utils/response.js";

// Tạo JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// @desc    Đăng ký user mới
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, password, fullName } = req.body;

    // Kiểm tra xem user đã tồn tại chưa thông qua repository
    const userExists = await userRepository.findOne({ username });

    if (userExists) {
      res.status(400);
      throw new Error("Tên người dùng đã tồn tại");
    }

    // Tạo user mới bằng repository
    const user = await userRepository.create({
      username,
      password,
      fullName,
    });

    if (user) {
      const token = generateToken(user.id);
      sendSuccess(res, 201, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        token,
      });
    } else {
      res.status(400);
      throw new Error("Dữ liệu không hợp lệ");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập & nhận token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Tìm user theo username và yêu cầu trả về cả trường password (để kiểm tra)
    const user = await userRepository.findByUsernameWithPassword(username);

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user.id);
      sendSuccess(res, 200, { token });
    } else {
      res.status(401);
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin profile của user
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (user) {
      sendSuccess(res, 200, user.toJSON());
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực Facebook (Nhận code, đổi sang short-lived token, sau đó nâng cấp thành long-lived token)
// @route   POST /api/v1/auth/facebook
// @access  Public
export const facebookAuth = async (req, res, next) => {
  try {
    const { code, redirectUri } = req.body;

    const appId = config.facebook.appId;
    const appSecret = config.facebook.appSecret;
    const finalRedirectUri = redirectUri || config.facebook.redirectUri;

    if (!appId || !appSecret) {
      res.status(500);
      throw new Error("Cấu hình Facebook App ID hoặc App Secret bị thiếu trên Server");
    }

    // Bước 1: Gửi request tới Facebook API để nhận token ngắn hạn (Short-lived Token)
    const shortLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&client_secret=${appSecret}&code=${code}`;

    const shortLivedResponse = await fetch(shortLivedTokenUrl);
    const shortLivedData = await shortLivedResponse.json();

    if (!shortLivedResponse.ok) {
      res.status(shortLivedResponse.status || 400);
      throw new Error(shortLivedData.error?.message || "Lỗi khi lấy Short-lived Token từ Facebook");
    }

    const shortLivedAccessToken = shortLivedData.access_token;

    // Bước 2: Đổi sang Long-lived User Access Token (Thời hạn ~60 ngày)
    const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedAccessToken}`;

    const longLivedResponse = await fetch(longLivedTokenUrl);
    const longLivedData = await longLivedResponse.json();

    if (!longLivedResponse.ok) {
      res.status(longLivedResponse.status || 400);
      throw new Error(longLivedData.error?.message || "Lỗi khi đổi sang Long-lived Token từ Facebook");
    }

    const longLivedAccessToken = longLivedData.access_token;

    // Lấy thông tin user profile từ Facebook bằng long-lived token
    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${longLivedAccessToken}`;
    const profileResponse = await fetch(profileUrl);
    let facebookProfile = null;
    if (profileResponse.ok) {
      facebookProfile = await profileResponse.json();
    }

    if (!facebookProfile) {
      res.status(400);
      throw new Error("Không thể lấy thông tin profile người dùng từ Facebook");
    }

    // Kiểm tra xem người dùng hiện tại đã đăng nhập hệ thống của chúng ta chưa (nếu có gửi token JWT lên)
    let user = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, config.jwt.secret);
        user = await userRepository.findById(decoded.id);
      } catch (err) {
        // Bỏ qua lỗi xác thực token, tiếp tục đăng nhập dạng guest SSO
      }
    }

    if (user) {
      // Trường hợp 1: User đã đăng nhập, thực hiện liên kết tài khoản Facebook mới vào danh sách SocialAccount của họ
      await socialAccountRepository.model.findOneAndUpdate(
        { user: user.id, platform: "facebook", platformId: facebookProfile.id },
        {
          name: facebookProfile.name,
          email: facebookProfile.email,
          avatarUrl: facebookProfile.picture?.data?.url,
          accessToken: longLivedAccessToken,
        },
        { upsert: true, new: true }
      );
    } else {
      // Trường hợp 2: Đăng nhập bằng SSO Facebook
      // Tìm xem tài khoản Facebook này đã liên kết với User nào chưa
      let linkedAccount = await socialAccountRepository.findOne({ platform: "facebook", platformId: facebookProfile.id });

      if (linkedAccount) {
        // Đã từng liên kết, chỉ cần cập nhật Access Token dài hạn mới và lấy User đó ra
        linkedAccount.accessToken = longLivedAccessToken;
        linkedAccount.name = facebookProfile.name;
        linkedAccount.email = facebookProfile.email;
        linkedAccount.avatarUrl = `https://graph.facebook.com/${facebookProfile.id}/picture?type=large`;
        await linkedAccount.save();

        user = await userRepository.findById(linkedAccount.user);
      } else {
        // Tạo tài khoản User mới hoàn toàn từ thông tin Facebook
        const randomPass = Math.random().toString(36).slice(-8) + "A1!";
        user = await userRepository.create({
          username: `fb${facebookProfile.id}`,
          password: randomPass,
          fullName: facebookProfile.name || "Người dùng Facebook",
          avatarUrl: `https://graph.facebook.com/${facebookProfile.id}/picture?type=large`,
        });

        // Tạo liên kết SocialAccount cho User mới này
        await socialAccountRepository.create({
          user: user.id,
          platform: "facebook",
          platformId: facebookProfile.id,
          name: facebookProfile.name,
          email: facebookProfile.email,
          avatarUrl: `https://graph.facebook.com/${facebookProfile.id}/picture?type=large`,
          accessToken: longLivedAccessToken,
        });
      }
    }

    // Tạo JWT Token cho ứng dụng của chúng ta
    const jwtToken = generateToken(user.id);

    // Trả về cho client thông tin token dài hạn, profile Facebook và Token JWT của ứng dụng
    sendSuccess(res, 200, {
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      facebookTokenInfo: {
        access_token: longLivedAccessToken,
        token_type: longLivedData.token_type,
        expires_in: longLivedData.expires_in,
      },
      profile: facebookProfile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy danh sách các trang Facebook thuộc sở hữu của tất cả các tài khoản FB đã liên kết
// @route   GET /api/v1/auth/facebook/pages
// @access  Private
export const getFacebookPages = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Tìm toàn bộ tài khoản Facebook đã được liên kết bởi user này
    const fbAccounts = await socialAccountRepository.find({ user: user.id, platform: "facebook" });
    if (!fbAccounts || fbAccounts.length === 0) {
      res.status(400);
      throw new Error("Chưa có tài khoản Facebook nào được liên kết với tài khoản này");
    }

    // Lấy Fanpage từ từng tài khoản Facebook đã liên kết song song
    const fetchPagesPromises = fbAccounts.map(async (account) => {
      try {
        const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,picture.type(large)&access_token=${account.accessToken}&limit=100`;
        const fbResponse = await fetch(accountsUrl);
        const fbData = await fbResponse.json();

        if (fbResponse.ok) {
          // Bổ sung thêm thông tin về tài khoản Facebook sở hữu trang này
          return (fbData.data || []).map(page => ({
            id: page.id,
            name: page.name,
            category: page.category,
            pictureUrl: page.picture?.data?.url,
            facebookId: account.platformId, 
            facebookAccountName: account.name,
            accessToken: page.access_token 
          }));
        }
      } catch (err) {
        console.error(`Lỗi khi lấy Fanpage cho tài khoản FB ${account.platformId}:`, err);
      }
      return [];
    });

    const pagesResults = await Promise.all(fetchPagesPromises);
    const allPages = pagesResults.flat();

    // Lấy các trang đã subscribe thành công trong DB
    const connectedPages = await socialChannelRepository.find({ user: user.id, platform: "facebook", isConnected: true });
    const connectedPageIds = new Set(connectedPages.map(page => page.platformChannelId));

    // Map lại kết quả, thêm cờ isConnected, đồng thời loại bỏ trường accessToken trước khi trả về client
    const clientPages = allPages.map(page => {
      const { accessToken, ...rest } = page;
      return {
        ...rest,
        isConnected: connectedPageIds.has(page.id)
      };
    });

    sendSuccess(res, 200, clientPages);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng ký (Subscribe) các trang Facebook
// @route   POST /api/v1/auth/facebook/pages
// @access  Private
export const subscribeFacebookPages = async (req, res, next) => {
  try {
    const { pageIds } = req.body;
    const user = req.user;

    const fbAccounts = await socialAccountRepository.find({ user: user.id, platform: "facebook" });
    if (!fbAccounts || fbAccounts.length === 0) {
      res.status(400);
      throw new Error("Chưa có tài khoản Facebook nào được liên kết với tài khoản này");
    }

    // 1. Thu thập tất cả các trang kèm token từ các tài khoản Facebook đã liên kết của người dùng
    const fetchPagesPromises = fbAccounts.map(async (account) => {
      try {
        const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,picture.type(large)&access_token=${account.accessToken}&limit=100`;
        const fbResponse = await fetch(accountsUrl);
        const fbData = await fbResponse.json();
        if (fbResponse.ok) {
          return (fbData.data || []).map(page => ({
            ...page,
            socialAccountId: account._id
          }));
        }
      } catch (err) {
        console.error(`Lỗi đồng bộ trang từ Facebook cho tài khoản ${account.platformId}:`, err);
      }
      return [];
    });

    const fbPagesResults = await Promise.all(fetchPagesPromises);
    const allFbPages = fbPagesResults.flat();
    const subscribedResults = [];

    // 2. Với mỗi pageId được chọn, đăng ký Webhook và lưu vào DB
    for (const pageId of pageIds) {
      const matchedPage = allFbPages.find(p => p.id === pageId);
      if (!matchedPage) continue;

      try {
        // Đăng ký nhận Webhook Messenger
        const subscribeFields = "messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads";
        const subscribeUrl = `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?subscribed_fields=${subscribeFields}&access_token=${matchedPage.access_token}`;
        
        const subResponse = await fetch(subscribeUrl, { method: "POST" });
        const subData = await subResponse.json();

        if (!subResponse.ok) {
          console.error(`Lỗi khi subscribe Fanpage ${pageId} trên Facebook:`, subData.error);
        }

        // Cập nhật thông tin vào DB
        const savedPage = await socialChannelRepository.model.findOneAndUpdate(
          { user: user.id, platform: "facebook", platformChannelId: pageId },
          {
            socialAccount: matchedPage.socialAccountId,
            name: matchedPage.name,
            accessToken: matchedPage.access_token,
            category: matchedPage.category,
            avatarUrl: `https://graph.facebook.com/${pageId}/picture?type=large`,
            isConnected: true,
          },
          { upsert: true, new: true }
        );

        subscribedResults.push(savedPage);
      } catch (err) {
        console.error(`Lỗi xử lý subscribe trang ${pageId}:`, err);
      }
    }

    sendSuccess(res, 200, subscribedResults);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy danh sách các trang Facebook đã được kết nối trong DB
// @route   GET /api/v1/auth/facebook/connected-pages
// @access  Private
export const getConnectedFacebookPages = async (req, res, next) => {
  try {
    const user = req.user;
    const pages = await socialChannelRepository.find({ user: user.id, platform: "facebook", isConnected: true });
    sendSuccess(res, 200, pages);
  } catch (error) {
    next(error);
  }
};

// @desc    Ngắt kết nối một Fanpage khỏi hệ thống
// @route   DELETE /api/v1/auth/facebook/pages/:pageId
// @access  Private
export const disconnectFacebookPage = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const user = req.user;

    // 1. Tìm thông tin Page đã kết nối trong DB (hỗ trợ cả database ID và platformChannelId)
    const page = await socialChannelRepository.findOne({
      user: user.id,
      platform: "facebook",
      $or: [
        { platformChannelId: pageId },
        { _id: pageId.match(/^[0-9a-fA-F]{24}$/) ? pageId : undefined }
      ].filter(Boolean)
    });

    if (!page) {
      res.status(404);
      throw new Error("Không tìm thấy trang kết nối trong hệ thống");
    }

    // 2. Gửi yêu cầu Unsubscribe app khỏi trang trên Facebook Graph API (để dừng nhận webhooks)
    try {
      const unsubscribeUrl = `https://graph.facebook.com/v19.0/${page.platformChannelId}/subscribed_apps?access_token=${page.accessToken}`;
      const unsubResponse = await fetch(unsubscribeUrl, { method: "DELETE" });
      const unsubData = await unsubResponse.json();

      if (!unsubResponse.ok) {
        console.warn(`Cảnh báo: Không thể hủy đăng ký webhook cho page ${page.platformChannelId} trên Facebook:`, unsubData.error);
      }
    } catch (err) {
      console.error(`Lỗi khi gọi API Facebook hủy đăng ký webhook:`, err);
    }

    // 3. Xóa thông tin trang khỏi cơ sở dữ liệu để hoàn tất ngắt kết nối
    await socialChannelRepository.model.deleteOne({ _id: page._id });

    sendSuccess(res, 200, { message: "Ngắt kết nối trang Facebook thành công" });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật cài đặt đồng bộ của Fanpage
// @route   PUT /api/v1/auth/facebook/pages/:pageId
// @access  Private
export const updateFacebookPageSettings = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { syncMessenger, syncComments } = req.body;
    const user = req.user;

    const page = await socialChannelRepository.findOne({
      user: user.id,
      platform: "facebook",
      $or: [
        { platformChannelId: pageId },
        { _id: pageId.match(/^[0-9a-fA-F]{24}$/) ? pageId : undefined }
      ].filter(Boolean)
    });

    if (!page) {
      res.status(404);
      throw new Error("Không tìm thấy trang kết nối trong hệ thống");
    }

    if (syncMessenger !== undefined) page.syncMessenger = syncMessenger;
    if (syncComments !== undefined) page.syncComments = syncComments;

    await page.save();

    sendSuccess(res, 200, page.toJSON());
  } catch (error) {
    next(error);
  }
};
