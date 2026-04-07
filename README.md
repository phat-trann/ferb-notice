# FerbNotice

Chrome extension nhắc check in ở lần active tab đầu tiên mỗi ngày và nhắc checkout sau đúng 9 giờ. Made by Ferb.

## Requirements

- `nvm`
- Node mới nhất. Workspace này đã được chuyển sang `v25.9.0`.

## Commands

```bash
source ~/.nvm/nvm.sh
nvm use node
npm install
npm run build
```

## Load In Chrome

1. Mở `chrome://extensions`
2. Bật `Developer mode`
3. Chọn `Load unpacked`
4. Trỏ đến thư mục `dist`

## Behavior

- Bấm icon extension để mở setup: bật/tắt reminder, chỉnh giờ vào muộn nhất, duration làm việc, nấc làm tròn checkout, và giờ check-in hôm nay.
- Mỗi ngày theo giờ hệ thống, lần đầu tiên bạn active vào một tab hợp lệ, extension sẽ hiện popup hỏi bạn đã check in chưa.
- Khi bạn bấm `Đã check in`, extension lưu timestamp vào `chrome.storage.local`.
- Nếu máy mở chậm hoặc check-in thực tế lệch so với giờ lưu, vào setup và chỉnh `Giờ check-in hôm nay`; extension sẽ tính lại mốc checkout, alarm, và badge.
- Nếu check in sau giờ vào muộn nhất trong setup, popup sẽ hiện thêm câu: `Trễ giờ check in T.T`.
- Sau `9h` làm việc, giờ checkout sẽ được làm tròn:
  - `09:01` -> `09:30`
  - `09:31` -> `10:00`
- Extension sẽ hiện popup nhắc `Nhớ checkout trước khi ra về` theo mốc đã làm tròn đó.
- Badge trên icon extension sẽ hiện:
  - `IN?` màu đỏ khi chưa check in
  - countdown khi đang trong 9 giờ làm việc
  - `OUT` màu xanh khi đã đủ giờ checkout

## Project Structure

- `src/background.ts`: service worker quản lý state, alarm, và logic tab activation
- `src/content.ts`: UI popup inject vào tab hiện tại
- `src/types.d.ts`: shared runtime contracts
- `static/manifest.json`: manifest MV3
- `docs/ai-data-contract.md`: schema dữ liệu và message flow để AI khác đọc được
