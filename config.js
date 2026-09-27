/**
 * ====================================================================
 *                 BIO PAGE - CẤU HÌNH TÙY CHỈNH (CONFIG)
 * ====================================================================
 * Đây là file DUY NHẤT cần sửa để đưa trang thành của bạn.
 * Sau khi sửa xong, chạy `node setup.mjs` để đồng bộ phần còn lại
 * (tiêu đề tab, thẻ chia sẻ, manifest, sitemap, robots, service worker).
 */

const CONFIG = {
    // ====================================================================
    // 0. THÔNG TIN WEBSITE (dùng để sinh tiêu đề, thẻ chia sẻ, SEO...)
    // ====================================================================
    site: {
        // Tên đầy đủ (hiện ở footer và thẻ chia sẻ Facebook/Discord)
        fullName: "Nguyễn Lương",
        // Domain thật của trang sau khi deploy — KHÔNG có https:// và không có / cuối.
        // Dùng miễn phí: để nguyên subdomain *.pages.dev của bạn (vd "ten-ban.pages.dev").
        domain: "luongkun.pages.dev",
        // Mô tả trang khi dán link lên Facebook / Messenger / Discord / Zalo
        description: "Trang bio cá nhân: Discord presence thời gian thực, máy chủ đang tham gia, nhạc nền và khung ủng hộ.",
        // Câu nhỏ dưới tên ở màn hình chào
        welcomeText: "welcome to my quiet corner",
        // Chữ trên nút vào trang ở màn hình chào
        enterLabel: "open sanctuary",
        // Footer: chữ logo giữa card + chữ nhỏ bên cạnh
        footerBrand: "NGUYỄN LƯƠNG",
        footerSuffix: "PROFILE",
        // 1-2 chữ cái trong icon favicon / icon cài app (sinh lại bằng make_icons.py)
        monogram: "NL"
    },

    // TÊN WEB (hiện ở tiêu đề tab, gõ chữ xoá chữ lặp lại trong script.js).
    // Để trống "" nếu muốn tiêu đề chạy theo tên hiển thị Discord.
    siteName: "@Luong Kun",

    // 1. DISCORD USER ID (bật Developer Mode trong Discord -> chuột phải avatar -> Copy User ID):
    // discordEnabled: false -> tắt hẳn kết nối Discord (ẩn vùng presence, dot trạng thái,
    // nhãn DISCORD LIVE và nút Copy Discord) — trang vẫn chạy như một bio bình thường.
    discordEnabled: true,
    discordId: "1222143238056574990",

    // 2. THÔNG TIN PROFILE:
    //    name / username / avatar bên dưới chỉ là giá trị DỰ PHÒNG lúc trang mới tải
    //    (hoặc khi Discord ID chưa kích hoạt Lanyard). Ngay khi có dữ liệu từ Discord,
    //    script.js sẽ tự ghi đè bằng tên hiển thị, username, avatar và khung avatar thật.
    profile: {
        name: "Toa",
        // true  = tên trên card lấy theo tên hiển thị Discord (đồng bộ realtime)
        // false = luôn giữ đúng "name" ở trên, bỏ qua tên tài khoản Discord
        syncNameWithDiscord: true,
        username: "chilanoidau",
        title: "Gamer • Music Lover • Coffee Addict",
        avatar: "https://cdn.discordapp.com/avatars/1222143238056574990/cd20117cf2a6a045b8dd4b62cc048320.png?size=256",
        // Ảnh dự phòng local khi cdn.discordapp.com bị nhà mạng chặn (xảyra thật ở VN)
        avatarLocal: "avatar-me.webp",
        banner: "banner_executive.webp",
        bio: "Just a normal guy who enjoys the simple things in life. Passionate about gaming, good music, and a perfect cup of coffee. Love traveling to new places, capturing moments, and binge-watching movies. Welcome to my little corner of the internet.",
        location: "Ninh Bình, Việt Nam",
        quotes: [
            "Gaming, coffee & good vibes.",
            "Living one chill day at a time.",
            "Music on, worries off.",
            "Collecting moments, not things."
        ],
        badges: [
            { icon: "fa-solid fa-gamepad", label: "Gamer", color: "#ffffff" },
            { icon: "fa-solid fa-headphones", label: "Music Lover", color: "#e0e0e0" },
            { icon: "fa-solid fa-mug-hot", label: "Coffee Addict", color: "#ffffff" },
            { icon: "fa-solid fa-plane", label: "Traveler", color: "#d1d5db" },
            { icon: "fa-solid fa-camera", label: "Photography", color: "#a1a1aa" },
            { icon: "fa-solid fa-film", label: "Movie Buff", color: "#ffffff" }
        ]
    },

    // 3. DANH SÁCH DISCORD SERVER:
    servers: [
        {
            // Tên, avatar, số thành viên & số online sẽ được cập nhật real-time từ Discord
            // (script.js gọi api discord.com/api/v9/invites/{code}?with_counts=true)
            name: "Starlight Brigade",
            role: "Cộng đồng Starlight Brigade",
            description: "Máy chủ Discord Starlight Brigade — nơi giao lưu, chơi game và kết nối cùng mọi người.",
            // Invite vĩnh viễn (không có expires_at) — kiểm tra bằng API invites/{code}?with_counts=true
            inviteUrl: "https://discord.gg/Mf2EHfNbMW",
            icon: "https://cdn.discordapp.com/icons/1267096791443312734/cd3ef9fd53d343c4c735e0640a6fb9c9.png?size=256",
            // Server này chưa có banner riêng nên dùng ảnh local làm ảnh nền dự phòng
            banner: "profile_banner_cyber.webp",
            cdnIcon: "https://cdn.discordapp.com/icons/1267096791443312734/cd3ef9fd53d343c4c735e0640a6fb9c9.png?size=256",
            cdnBanner: "profile_banner_cyber.webp",
            members: "47 Members",
            online: "19 Online",
            tag: "COMMUNITY",
            featured: true
        }
    ],

    // 4. MẠNG XÃ HỘI / LIÊN HỆ (DIRECT CONNECTIONS):
    // Mục có field "copy" sẽ KHÔNG mở link — click là sao chép giá trị đó + toast thông báo.
    socials: [
        { name: "Facebook", icon: "fa-brands fa-facebook", url: "https://www.facebook.com/nlwos" },
        { name: "Email", icon: "fa-solid fa-envelope", url: "", copy: "lucifermeta0210@gmail.com" },
        { name: "TikTok", icon: "fa-brands fa-tiktok", url: "https://www.tiktok.com/@nlwo2" },
        { name: "Spotify", icon: "fa-brands fa-spotify", url: "https://open.spotify.com/user/31qttkds2lxweu7s5qxqrms2ab2i?si=d5a2f7b40b2e412f" },
        // Mục có action: "donate" KHÔNG mở link — bấm là hiện ảnh QR ở giữa màn hình.
        // highlight: true -> nút nổi bật, chiếm trọn một hàng (xem mục `donate` bên dưới)
        { name: "Donate", icon: "fa-solid fa-qrcode", action: "donate", highlight: true }
    ],

    // 4.2 ỦNG HỘ (DONATE) — bấm nút Donate sẽ hiện ảnh QR ngân hàng giữa màn hình
    donate: {
        // Tên file ảnh QR, đặt cùng thư mục với index.html.
        // Khi chưa có file, hộp thoại hiện khung hướng dẫn thay vì ảnh vỡ.
        // Chỉ cần đặt ảnh vào repo với đúng tên này là QR tự hiện, không phải sửa code.
        qrImage: "qr-bank.png",
        // Thông tin chuyển khoản — dòng nào để trống "" thì tự ẩn
        bankName: "",
        accountName: "",
        accountNumber: "",
        note: ""
    },

    // 4.1 MÀN "SETLOVE" (trượt từ phải sang):
    //     enabled: false -> ẩn hẳn nút trái tim góc màn + panel (không dùng tính năng này).
    //     tên tạm + ngày tạm — nhớ sửa lại cho đúng nhé!
    setlove: {
        enabled: true,
        myName: "Lương",
        partnerName: "Tuyết Anh",
        // Avatar + khung đồng bộ từ Discord qua Lanyard (chỉ avatar & khung, tên giữ nguyên theo config)
        myDiscordId: "1222143238056574990",
        partnerDiscordId: "1507678870000893982",
        // Ảnh dự phòng local cho avatar + khung của cả hai (CDN Discord bị chặn,
        // hoặc Lanyard sập mà chưa có cache trong trình duyệt khách)
        localVisuals: {
            "1222143238056574990": { avatar: "avatar-me.webp", deco: "deco-me.webp" },
            "1507678870000893982": { avatar: "avatar-partner.webp", deco: null }
        },
        // Ngày bắt đầu yêu (YYYY-MM-DD, giờ Việt Nam). Từ ngày này script tự tính:
        // số ngày đã yêu và mốc kỷ niệm (1 tháng = 30 ngày).
        startDate: "2026-05-27",

        // Dải ảnh kỷ niệm (tuỳ chọn). Để trống [] thì panel Setlove y như cũ.
        // Mỗi mục một dòng: { src: "<đường dẫn ảnh>", caption: "<chú thích ngắn>" }
        // Ảnh chỉ được tải khi khách thật sự mở panel, nên trang vẫn nhẹ.
        photos: [],
        // Lời nhắn yêu thương — bấm vào câu chữ ở panel để đổi qua lại
        quotes: [
            "Yêu nhau yêu hẳn đi — đừng nửa vời nửa vời 💕",
            "Cả thế giới này, anh chỉ cần em 🌍",
            "Em là món quà tuyệt vời nhất anh từng nhận được 🎁",
            "Bên em, mỗi ngày đều là một ngày đáng sống ☀️",
            "Anh không hứa trăm năm — anh hứa mỗi ngày đều yêu em 💍",
            "Đường về nhà dài nhất, là đường về bên em 🏠",
            "Yêu em không phải lựa chọn, là bản năng 💓",
            "Có em, mọi ngày đều là ngày đáng nhớ 📖",
            "Anh xin đợi cả đời chỉ để gặp em 💫",
            "Anh nhớ em hơn cả nhớ bản thân mình 💗"
        ]
    },

    // 5. NHẠC NỀN & PLAYLIST (AUDIO PLAYLIST):
    music: {
        autoplayOnEnter: true,
        // 1 = mở trang là thanh âm lượng đã kéo sẵn tối đa (0.5 = một nửa...)
        volume: 1,
        playlist: [
            {
                title: "Mưa Đợi Chờ",
                artist: "Nguyễn Lương",
                url: "bai1.mp3"
            },
            {
                title: "Tháng 12 Anh Có",
                artist: "Nguyễn Lương",
                url: "thang12-anh-co.mp3"
            },
            {
                title: "Thất Tình",
                artist: "Nguyễn Lương",
                url: "that-tinh.mp3"
            },
            {
                title: "Chàng Trai Bất Tử",
                artist: "Nguyễn Lương",
                url: "chang-trai-bat-tu.mp3"
            }
        ],
        // Default / Initial Track Fallback
        title: "Mưa Đợi Chờ",
        artist: "Nguyễn Lương",
        url: "bai1.mp3"
    },

    // 6. HIỆU ỨNG:
    effects: {
        enableTilt: true,
        enableSpotlight: true,
        enableCustomCursor: true,
        enableParticles: true,
        enableShootingStars: true
    },

    // 7. SỞ THÍCH & PHONG CÁCH SỐNG (CORE - 6 PILLARS):
    techStack: [
        { name: "Gaming", domain: "PC • Mobile • Co-op", icon: "fa-solid fa-gamepad" },
        { name: "Nghe nhạc", domain: "Lofi • Chill • V-Pop", icon: "fa-solid fa-headphones" },
        { name: "Cà phê", domain: "Sáng • Sữa đá • Góc chill", icon: "fa-solid fa-mug-hot" },
        { name: "Du lịch", domain: "Biển • Núi • Khám phá", icon: "fa-solid fa-plane" },
        { name: "Chụp ảnh", domain: "Khoảnh khắc • Đời thường", icon: "fa-solid fa-camera" },
        { name: "Xem phim", domain: "Anime • Phim lẻ • Series", icon: "fa-solid fa-film" }
    ]
};



