/**
 * ====================================================================
 *                 VTH BIO - CẤU HÌNH TÙY CHỈNH (CONFIG)
 * ====================================================================
 * Professional English Configuration & Elite Bio Information
 */

const CONFIG = {
    // 0. TÊN WEB (hiện ở tiêu đề tab, gõ chữ xoá chữ lặp lại trong script.js).
    siteName: "@vth",

    // 1. DISCORD USER ID:
    discordId: "1230903912660471830",

    // 2. THÔNG TIN PROFILE (tĩnh, không liên kết Discord):
    profile: {
        name: "𐙚⋆. 𝐂һɪαrα 𓂃 ˖ ִֶָ𐀔 ‧₊˚⊹",
        // true  = tên trên card lấy theo tên hiển thị Discord (đồng bộ realtime)
        // false = luôn giữ đúng "name" ở trên, bỏ qua tên tài khoản Discord
        syncNameWithDiscord: true,
        username: "chiraqing",
        title: "Gamer • Music Lover • Coffee Addict",
        avatar: "https://cdn.discordapp.com/avatars/1230903912660471830/04b7d3548cea2cbd7b2a6d430434c755.png?size=256",
        // Ảnh dự phòng local khi cdn.discordapp.com bị nhà mạng chặn
        avatarLocal: "avatar-me.webp",
        banner: "banner_executive.webp",
        bio: "Somewhere between dreams and reality, i am becoming someone i have always wanted to be. Soft enough to feel everything, strong enough to keep growing, and mysterious enough to remain my own little secret. 𐙚",
        location: "Bình Dương, Việt Nam",
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
            // Card nhóm Zalo: API Discord không dùng được nên mọi thông tin
            // lấy tĩnh từ config (script.js tự bỏ qua fetch khi link không
            // phải discord.gg)
            name: "Box acc Jully",
            role: "Nhóm chat Zalo",
            description: "Thu acc/glbt/dịch vụ game LQM nha<br>Cân gdtg/gdtt ạ",
            inviteUrl: "https://zalo.me/g/6gvxui9zmvfwqltqr7fs",
            iconClass: "fa-solid fa-comments",
            banner: "server_banner.webp",
            statsText: "Zalo • Nhóm chat cộng đồng",
            tag: "ZALO",
            joinText: "Tham gia",
            joinIcon: "fa-solid fa-arrow-right-to-bracket",
            featured: true
        }
    ],

    // 4. MẠNG XÃ HỘI / LIÊN HỆ (DIRECT CONNECTIONS):
    // Mục có field "copy" sẽ KHÔNG mở link — click là sao chép giá trị đó + toast thông báo.
    socials: [
        { name: "Facebook", icon: "fa-brands fa-facebook", url: "https://www.facebook.com/share/14r1PsKQ64r/" },
        { name: "Locket", icon: "fa-solid fa-camera", url: "https://locket.cam/vthanh0" },
        { name: "Legit", icon: "fa-solid fa-circle-check", url: "https://www.facebook.com/share/p/1FRxoTNiv6/" },
        { name: "Spotify", icon: "fa-brands fa-spotify", url: "https://open.spotify.com/intl-vi/track/3dtsajYLPPVvDPySYmYGpD?si=8461b8151cba48a0" },
        // Mục có action: "donate" KHÔNG mở link — bấm là hiện ảnh QR ở giữa màn hình.
        // highlight: true -> nút nổi bật, chiếm trọn một hàng (xem mục `donate` bên dưới)
        { name: "Donate", icon: "fa-solid fa-qrcode", action: "donate", highlight: true }
    ],

    // 4.2 ỦNG HỘ (DONATE) — bấm nút Donate sẽ hiện ảnh QR ngân hàng giữa màn hình
    donate: {
        // Tên file ảnh QR, đặt cùng thư mục với index.html.
        // Khi chưa có file, hộp thoại hiện khung hướng dẫn thay vì ảnh vỡ.
        // Chỉ cần đặt ảnh vào repo với đúng tên này là QR tự hiện, không phải sửa code.
        qrImage: "qr-bank-v2.png",
        // Thông tin chuyển khoản — dòng nào để trống "" thì tự ẩn
        bankName: "",
        accountName: "",
        accountNumber: "",
        note: ""
    },

    // 5. NHẠC NỀN & PLAYLIST (AUDIO PLAYLIST):
    music: {
        autoplayOnEnter: true,
        // 1 = mở trang là thanh âm lượng đã kéo sẵn tối đa (0.5 = một nửa...)
        volume: 1,
        playlist: [
            {
                title: "only u",
                artist: "vth",
                url: "1.mp3"
            },
            {
                title: "Dear me in the future",
                artist: "vth",
                url: "2.mp3"
            },
            {
                title: "your life",
                artist: "vth",
                url: "3.mp3"
            }
        ],
        // Default / Initial Track Fallback
        title: "only u",
        artist: "vth",
        url: "1.mp3"
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



