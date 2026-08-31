import { Workbook } from "exceljs";
import { getSession } from "@/lib/session";
import { APP_NAME } from "@/lib/app-info";
import { COOKING_METHODS } from "@/lib/validations";
import { MAX_IMPORT_ROWS } from "@/lib/import-foods";

const HEADER_FILL = "FF38754A";

/** Tải file Excel mẫu để nhập món ăn hàng loạt. */
export async function GET() {
  if (!(await getSession())) {
    return new Response("Chưa đăng nhập", { status: 401 });
  }

  const workbook = new Workbook();
  workbook.creator = APP_NAME;

  const sheet = workbook.addWorksheet("Món ăn");
  sheet.columns = [
    { header: "Tên món", width: 28 },
    { header: "Loại (Chính/Phụ)", width: 18 },
    { header: "Cách chế biến", width: 16 },
    { header: "Nguyên liệu (cách nhau dấu phẩy)", width: 48 },
    { header: "Yêu thích (0-5)", width: 15 },
    { header: "Ghi chú", width: 32 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle" };
  });

  sheet.addRow([
    "Gà kho sả ớt",
    "Chính",
    "Kho",
    "Đùi gà, Sả, Ớt, Nước mắm",
    4,
    "Dòng ví dụ — thay bằng món của bạn",
  ]);
  sheet.addRow([
    "Canh cải ngọt nấu tôm",
    "Phụ",
    "Canh",
    "Cải ngọt, Tôm khô, Hành tím",
    3,
    "Dòng ví dụ — thay bằng món của bạn",
  ]);

  // dropdown Chính/Phụ + ràng buộc điểm yêu thích cho các dòng nhập liệu
  for (let r = 2; r <= MAX_IMPORT_ROWS + 1; r++) {
    sheet.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Chính,Phụ"'],
    };
    sheet.getCell(`E${r}`).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [0, 5],
    };
  }

  const guide = workbook.addWorksheet("Hướng dẫn");
  guide.getColumn(1).width = 100;
  const lines = [
    `HƯỚNG DẪN NHẬP MÓN ĂN VÀO ${APP_NAME.toUpperCase()}`,
    "",
    "1. Điền món vào sheet “Món ăn”, mỗi dòng một món, bắt đầu từ dòng 2.",
    "2. Tên món (bắt buộc) — ví dụ: Thịt kho trứng.",
    "3. Loại (bắt buộc) — chọn Chính hoặc Phụ (món mặn ăn chính / canh, rau ăn kèm).",
    "4. Cách chế biến — gợi ý: " +
      COOKING_METHODS.join(", ") +
      ". Bỏ trống sẽ thành “Khác”.",
    "5. Nguyên liệu — viết liền một ô, cách nhau bằng dấu phẩy. Ví dụ: Thịt ba rọi, Trứng vịt, Nước dừa.",
    "6. Yêu thích — số từ 0 đến 5 sao, bỏ trống là 0.",
    "7. Hai dòng ví dụ có sẵn: sửa lại hoặc xóa đi trước khi nhập.",
    "",
    `Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} món. Món trùng tên (cùng loại) với món đã có sẽ tự động được bỏ qua.`,
    "Sau khi điền xong: mở app → tab Món ăn → Nhập Excel → chọn file này → xem trước → xác nhận.",
  ];
  for (const [i, text] of lines.entries()) {
    const cell = guide.getCell(`A${i + 1}`);
    cell.value = text;
    cell.alignment = { wrapText: true, vertical: "top" };
    if (i === 0) cell.font = { bold: true, color: { argb: HEADER_FILL } };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-mon-an-com-nha.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
