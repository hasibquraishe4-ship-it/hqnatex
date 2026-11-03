"""
Reusable legacy technical-profile family definitions.

This module contains DATA DEFINITIONS ONLY.

The old management command `seed_technical_profiles`
is retired and must not be used for reconciliation.

HQNATEX Technical Profile V2 may reuse validated legacy
families from this neutral module without depending on
the retired management command.
"""

TECH_PROFILES_DEF = {
    "DSL": {
        "name": "xDSL Standard Technical Profile",
        "patterns": ["adsl", "vdsl", "xdsl", "shdsl", "copper", "svc-001"],
        "fields": [
            ("dsl_number", "DSL Number", "شماره دی‌اس‌ال", "د ډي‌اس‌ایل شمیره", "text", True, [], 10),
            ("mdf", "MDF", "ام‌دی‌اف", "ام‌ډي‌ایف", "text", False, [], 20),
            ("cabinet", "Cabinet", "کابینت", "کابینټ", "text", False, [], 30),
            ("copper_pair", "Copper Pair", "زوج مسی", "مسي جوړه", "text", False, [], 40),
            ("dslam", "DSLAM", "دی‌اس‌لم", "ډي‌اس‌لم", "text", False, [], 50),
            ("dslam_port", "DSLAM Port", "پورت دی‌اس‌لم", "د ډي‌اس‌لم پورټ", "text", True, [], 60),
            ("line_profile", "Line Profile", "پروفایل خط", "د کرښې پروفایل", "text", False, [], 70),
            ("pppoe_username", "PPPoE Username", "نام کاربری PPPoE", "د PPPoE کارن نوم", "text", True, [], 80),
            ("vlan", "VLAN", "وی‌لن", "وي‌لن", "integer", False, [], 90),
            ("ip", "IP Address", "آدرس آی‌پی", "د آی پي ادرس", "ip", False, [], 100),
            ("line_attenuation", "Line Attenuation (dB)", "افت خط", "د کرښې ضایع", "decimal", False, [], 110),
            ("snr", "SNR Margin (dB)", "نسبت سیگنال به نویز", "د سیګنال او شور تناسب", "decimal", False, [], 120),
            ("sync_rate", "Sync Rate (Mbps)", "سرعت همگام‌سازی", "د همغږۍ سرعت", "decimal", False, [], 130),
            ("port_status", "Port Status", "وضعیت پورت", "د پورټ حالت", "choice", False, ["up", "down", "testing", "disabled"], 140),
        ]
    },
    "FIBER": {
        "name": "GPON / FTTH Technical Profile",
        "patterns": ["fiber", "ftth", "fttb", "fttc", "fttp", "gpon", "xgs", "pon", "svc-006", "svc-008", "svc-010", "svc-011", "svc-023", "svc-024", "svc-025", "svc-026", "svc-028", "svc-029"],
        "fields": [
            ("olt", "OLT Name/ID", "نام OLT", "د OLT نوم", "text", True, [], 10),
            ("olt_port", "OLT Port", "پورت OLT", "د OLT پورټ", "text", True, [], 20),
            ("pon", "PON Port", "پورت PON", "د PON پورټ", "text", True, [], 30),
            ("odf", "ODF", "ترمینال توزیع نوری ODF", "د نوري ویش ترمینل", "text", False, [], 40),
            ("splitter", "Splitter", "اسپلیتر نوری", "نوري ویشونکی", "text", False, [], 50),
            ("splitter_port", "Splitter Port", "پورت اسپلیتر", "د ویشونکي پورټ", "text", False, [], 60),
            ("fiber_core", "Fiber Core", "رشته فیبر نوری", "د نوري فایبر رشته", "text", False, [], 70),
            ("ont_serial", "ONT Serial", "شماره سریال ONT", "د ONT سریال شمیره", "text", True, [], 80),
            ("ont_model", "ONT Model", "مدل مودم ONT", "د ONT ماډل", "text", False, [], 90),
            ("ont_port", "ONT Port", "پورت LAN مودم", "د مودم LAN پورټ", "text", False, [], 100),
            ("vlan", "VLAN", "شناسه وی‌لن", "د وي‌لن پیژند", "integer", False, [], 110),
            ("pppoe_username", "PPPoE Username", "نام کاربری PPPoE", "د PPPoE کارن نوم", "text", True, [], 120),
            ("ip", "IP Address", "آدرس آی‌پی", "د آی پي ادرس", "ip", False, [], 130),
            ("optical_rx", "Optical RX (dBm)", "توان دریافت نوری RX", "د نوري ترلاسه کولو ځواک", "decimal", False, [], 140),
            ("optical_tx", "Optical TX (dBm)", "توان ارسال نوری TX", "د نوري لیږلو ځواک", "decimal", False, [], 150),
            ("optical_status", "Optical Status", "وضعیت لینک نوری", "د نوري لینک حالت", "choice", False, ["normal", "low_signal", "critical", "los"], 160),
        ]
    },
    "WIRELESS": {
        "name": "Wireless / P2P / FWA Profile",
        "patterns": ["wireless", "p2p", "p2mp", "fwa", "microwave", "five_g_fwa", "hotspot", "svc-014", "svc-015", "svc-018", "svc-030", "svc-031"],
        "fields": [
            ("site", "Base Site", "نام سایت مبدأ", "د بیس سایټ نوم", "text", True, [], 10),
            ("tower", "Tower ID", "شناسه تاور دکل", "د مخابراتي برج پیژند", "text", False, [], 20),
            ("sector", "Sector", "سکتور آنتن", "د انټینا سکټور", "text", False, [], 30),
            ("ap", "Access Point (AP)", "نقطه دسترسی AP", "د لاسرسي نقطه", "text", False, [], 40),
            ("radio", "Radio Model", "مدل رادیو", "د راډیو ماډل", "text", False, [], 50),
            ("cpe", "CPE Serial", "سریال رادیو مشتری", "د مشترک راډیو سریال", "text", True, [], 60),
            ("frequency", "Frequency (MHz)", "فرکانسی کاری", "عملیاتي فریکونسي", "decimal", False, [], 70),
            ("channel", "Channel", "کانال", "چینل", "text", False, [], 80),
            ("bandwidth", "Bandwidth (MHz)", "پهنای باند کانال", "د چینل بینډویډت", "decimal", False, [], 90),
            ("polarization", "Polarization", "پلاریزاسیون", "قطبیت", "choice", False, ["vertical", "horizontal", "dual"], 100),
            ("signal_rx_tx", "TX/RX Signal (dBm)", "سطح سیگنال", "د سیګنال کچه", "text", False, [], 110),
            ("ccq", "CCQ (%)", "کیفیت ارتباط CCQ", "د لینک کیفیت سلنه", "decimal", False, [], 120),
            ("link_distance", "Distance (km)", "فاصله لینک", "د لینک فاصله", "decimal", False, [], 130),
            ("vlan", "VLAN", "وی‌لن", "وي‌لن", "integer", False, [], 140),
            ("ip", "IP Address", "آدرس آی‌پی", "د آی پي ادرس", "ip", False, [], 150),
        ]
    },
    "VSAT": {
        "name": "Satellite / VSAT Technical Profile",
        "patterns": ["vsat", "satellite", "sat", "sat_backup", "svc-036", "svc-037", "svc-038"],
        "fields": [
            ("satellite", "Satellite", "نام ماهواره", "د سپوږمکۍ نوم", "text", True, [], 10),
            ("beam", "Beam", "پرتو پوشش", "د سپوږمکۍ پوښښ شعاع", "text", False, [], 20),
            ("hub", "Hub / Teleport", "ایستگاه زمینی Teleport", "د ځمکني سټیشن هب", "text", False, [], 30),
            ("modem", "Modem Model", "مدل مودم ماهواره", "د سټلایټ موډیم ماډل", "text", True, [], 40),
            ("terminal_id", "Terminal ID", "شناسه ترمینل ماهواره", "د سپوږمکۍ ترمینل پیژند", "text", True, [], 50),
            ("dish", "Dish Size (m)", "اندازه دیش", "د ډش اندازه", "text", False, [], 60),
            ("frequency", "Frequency (GHz)", "فرکانسی کاری", "عملیاتي فریکونسي", "decimal", False, [], 70),
            ("symbol_rate", "Symbol Rate (Msps)", "نرخ سمبول", "د سمبول نرخ", "decimal", False, [], 80),
            ("bandwidth", "Bandwidth (MHz)", "پهنای باند تخصیصی", "تخصیص شوی بینډویډت", "decimal", False, [], 90),
            ("ip", "IP Address", "آدرس آی‌پی", "د آی پي ادرس", "ip", False, [], 100),
            ("signal", "Signal (C/N dB)", "سطح سیگنال C/N", "د سیګنال کچه", "decimal", False, [], 110),
            ("capacity", "Committed Capacity", "ظرفیت تعهد شده", "ژمنه شوې وړتیا", "text", False, [], 120),
        ]
    },
    "DIA": {
        "name": "Dedicated Internet Access Profile",
        "patterns": ["dia", "dedicated", "symmetric", "leased_line", "svc-016", "svc-017", "svc-021", "svc-022"],
        "fields": [
            ("access_type", "Access Type", "نوعیت دسترسی", "د لاسرسي ډول", "choice", True, ["fiber", "wireless", "leased_line"], 10),
            ("circuit_id", "Circuit ID", "شناسه مدار اختصاصی", "د ځانګړي سرکټ پیژند", "text", True, [], 20),
            ("pop", "Edge POP", "مرکز توزیع POP", "د ویش مرکز", "text", False, [], 30),
            ("interface", "Interface Port", "پورت اینترفیس روتر", "د روټر انټرفیس پورټ", "text", True, [], 40),
            ("vlan", "VLAN", "وی‌لن اختصاصی", "ځانګړی وي‌لن", "integer", True, [], 50),
            ("public_ip", "Public IP", "آدرس آی‌پی عمومی", "عامه آی پي", "ip", True, [], 60),
            ("ipv4_prefix", "IPv4 Prefix", "پیشوند شبکه IPv4", "د IPv4 مختاړی", "cidr", False, [], 70),
            ("ipv6_prefix", "IPv6 Prefix", "پیشوند شبکه IPv6", "د IPv6 مختاړی", "cidr", False, [], 80),
            ("gateway", "Gateway", "درواژه پیش‌فرض", "ډیفالټ ګیټ وے", "ip", True, [], 90),
            ("dns", "DNS Servers", "سرورهای DNS", "د DNS سرورونه", "text", False, [], 100),
            ("bandwidth", "Bandwidth (Mbps)", "پهنای باند متعهد", "ژمنه شوی بینډویډت", "decimal", True, [], 110),
            ("cir", "CIR (Mbps)", "نرخ CIR", "د CIR کچه", "decimal", False, [], 120),
            ("bgp", "BGP Enabled", "پروتکل BGP فعال است", "آیا BGP روټینګ فعال دی", "boolean", False, [], 130),
            ("asn", "Customer ASN", "شماره سیستم خودگردان ASN", "د پیرودونکي ASN", "integer", False, [], 140),
        ]
    },
    "TRANSIT": {
        "name": "IP Transit / BGP Technical Profile",
        "patterns": ["transit", "bgp", "upstream", "svc-051", "svc-052", "svc-053", "svc-054"],
        "fields": [
            ("asn", "Local ASN", "سیستم خودمختار محلی", "د ځایی سیستم ASN", "integer", True, [], 10),
            ("peer_asn", "Peer ASN", "سیستم خودمختار طرف مقابل", "د مقابل لوري ASN", "integer", True, [], 20),
            ("router", "Core Router", "روتر اصلی هسته", "اصلي کور روټر", "text", True, [], 30),
            ("interface", "Interface", "اینترفیس ارتباطی", "د اړیکې انټرفیس", "text", True, [], 40),
            ("ipv4_prefix", "IPv4 Prefix", "پیشوند شبکه IPv4", "د IPv4 مختاړی", "cidr", False, [], 50),
            ("ipv6_prefix", "IPv6 Prefix", "پیشوند شبکه IPv6", "د IPv6 مختاړی", "cidr", False, [], 60),
            ("bgp_neighbor", "BGP Neighbor IP", "آدرس آی‌پی همسایه BGP", "د BGP ګاونډي آی پي", "ip", True, [], 70),
            ("vlan", "VLAN", "وی‌لن ارتباطی", "د پیوستون وي‌لن", "integer", False, [], 80),
            ("local_preference", "Local Preference", "اولویت محلی", "ځایی لومړیتوب", "integer", False, [], 90),
            ("med", "MED", "شاخص خروجی MED", "د وتلو پیژند MED", "integer", False, [], 100),
            ("community", "BGP Community", "کامیونیتی BGP", "د BGP ټولنې", "text", False, [], 110),
            ("session_status", "Session Status", "وضعیت نشست BGP", "د BGP ناستې حالت", "choice", False, ["established", "idle", "active", "connect"], 120),
        ]
    },
    "MPLS": {
        "name": "MPLS / VPN / Private WAN Profile",
        "patterns": ["mpls", "vpn", "l2vpn", "l3vpn", "metro_eth", "sdwan", "svc-057", "svc-058", "svc-060", "svc-061", "svc-062", "svc-063", "svc-064", "svc-065", "svc-066", "svc-067"],
        "fields": [
            ("vrf", "VRF Name", "نام VRF", "د VRF نوم", "text", True, [], 10),
            ("rd", "Route Distinguisher (RD)", "ممیز مسیر RD", "د لارې بیلوونکی RD", "text", True, [], 20),
            ("rt", "Route Target (RT)", "هدف مسیر RT", "د لارې هدف RT", "text", True, [], 30),
            ("pe_router", "PE Router", "روتر لبه سرویس‌دهنده PE", "د چمتو کونکي PE روټر", "text", True, [], 40),
            ("ce_router", "CE Router", "روتر سمت مشترک CE", "د پیرودونکي CE روټر", "text", False, [], 50),
            ("interface", "Interface", "اینترفیس ارتباطی", "د پیوستون انټرفیس", "text", False, [], 60),
            ("vlan", "VLAN", "وی‌لن مشترک", "د پیرودونکي وي‌لن", "integer", True, [], 70),
            ("site", "Site Location", "موقعیت سایت/شعبه", "د څانګې موقعیت", "text", False, [], 80),
            ("circuit_id", "Circuit ID", "شناسه مدار ارتباطی", "د سرکټ پیژند", "text", False, [], 90),
            ("ip", "P2P IP", "آدرس آی‌پی ارتباطی", "د پیوستون آی پي", "ip", False, [], 100),
            ("bandwidth", "Bandwidth (Mbps)", "پهنای باند خط", "د کرښې بینډویډت", "decimal", True, [], 110),
        ]
    },
    "COLOCATION": {
        "name": "Colocation / Data Center Profile",
        "patterns": ["colocation", "rack", "server", "dedicated_server", "hosting", "datacenter", "backup_storage", "svc-068", "svc-069", "svc-070", "svc-071", "svc-072", "svc-073", "svc-074", "svc-075", "svc-076"],
        "fields": [
            ("datacenter", "Data Center", "مرکز داده", "د معلوماتو مرکز", "text", True, [], 10),
            ("rack", "Rack Number", "شماره رک", "د ریک شمیره", "text", True, [], 20),
            ("rack_unit", "Rack Unit (U)", "موقعیت یونیت", "د ریک موقعیت", "text", True, [], 30),
            ("server", "Server Tag", "مشخصه سرور", "د سرور نښه", "text", False, [], 40),
            ("power_feed", "Power Feed", "خط تغذیه برق", "د بریښنا رسولو مزي", "choice", False, ["single_a", "single_b", "dual_ab"], 50),
            ("port", "Switch Port", "پورت سوئیچ", "د سویچ پورټ", "text", False, [], 60),
            ("switch", "Switch Name", "نام سوئیچ", "د سویچ نوم", "text", False, [], 70),
            ("vlan", "VLAN", "وی‌لن اختصاصی", "ځانګړی وي‌لن", "integer", False, [], 80),
            ("public_ip", "Public IP", "آدرس آی‌پی عمومی", "عامه آی پي", "ip", False, [], 90),
            ("private_ip", "Private IP", "آدرس آی‌پی خصوصی", "خصوصي آی پي", "ip", False, [], 100),
        ]
    },
    "VOICE": {
        "name": "SIP Trunk / Voice Profile",
        "patterns": ["sip", "sip_trunk", "pbx", "hosted_pbx", "voice", "did", "svc-077", "svc-078", "svc-079", "svc-080", "svc-081"],
        "fields": [
            ("sip_account", "SIP Account", "حساب کاربری سیپ", "د سیپ اکاونټ پیژند", "text", True, [], 10),
            ("trunk_id", "Trunk ID", "شناسه ترانک", "د ټرانک پیژند", "text", True, [], 20),
            ("did", "DID Range", "شماره‌های اختصاصی تلفن", "د ځانګړو تلیفونونو شمیرې", "text", False, [], 30),
            ("sip_server", "SIP Proxy", "سرور پروکسی سیپ", "د سیپ سرور", "text", True, [], 40),
            ("ip", "Signaling IP", "آدرس آی‌پی سیگنالینگ", "د سیګنالینګ آی پي", "ip", True, [], 50),
            ("port", "SIP Port", "پورت سیپ", "د سیپ پورټ", "integer", False, [], 60),
            ("codec", "Audio Codec", "کدک صوتی", "د غږ کوډیک", "choice", False, ["G.711u", "G.711a", "G.729", "Opus"], 70),
            ("concurrent_channels", "Channels", "تعداد تماس‌های همزمان", "هممهاله اړیکې", "integer", True, [], 80),
            ("auth_type", "Auth Type", "نوعیت احراز هویت", "د تصدیق ډول", "choice", False, ["ip_auth", "digest_user_pass"], 90),
        ]
    }
}

