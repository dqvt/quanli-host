<script setup>
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Quy tắc sử dụng hệ thống</h2>

        <Accordion :multiple="true" :activeIndex="[0]">
            <AccordionTab header="Quy tắc chung">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Đăng nhập vào hệ thống bằng tài khoản được cấp.</li>
                    <li class="mb-2">Không chia sẻ thông tin đăng nhập với người khác.</li>
                    <li class="mb-2">Đảm bảo đăng xuất khi không sử dụng hệ thống.</li>
                    <li class="mb-2">Kiểm tra kỹ thông tin trước khi lưu hoặc cập nhật.</li>
                    <li class="mb-2">Không thoát khỏi trang khi đang nhập liệu mà chưa lưu.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý chuyến xe">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Chuyến xe mới sẽ có trạng thái "Chờ duyệt" (PENDING).</li>
                    <li class="mb-2">Sau khi duyệt, chuyến xe sẽ chuyển sang trạng thái "Chờ báo giá" (WAITING_FOR_PRICE).</li>
                    <li class="mb-2">Khi đã báo giá, chuyến xe sẽ chuyển sang trạng thái "Đã báo giá" (PRICED).</li>
                    <li class="mb-2">Chỉ những chuyến xe đã báo giá mới được tính vào công nợ khách hàng.</li>
                    <li class="mb-2">Khi báo giá, hệ thống sẽ tự động tính lương cho tài xế và phụ xe.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý khách hàng">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Mỗi khách hàng cần có ít nhất tên người đại diện.</li>
                    <li class="mb-2">Tên công ty không bắt buộc nhưng nên điền đầy đủ.</li>
                    <li class="mb-2">Công nợ khách hàng được tính dựa trên tổng giá trị các chuyến xe đã báo giá.</li>
                    <li class="mb-2">Có thể đính kèm file Excel hoặc nhập dữ liệu công nợ từ file Excel.</li>
                    <li class="mb-2">Có thể thêm thanh toán cho từng khách hàng để cập nhật công nợ.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý nhân viên">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Nhân viên bao gồm tài xế và phụ xe.</li>
                    <li class="mb-2">Mỗi nhân viên cần có tên đầy đủ và số điện thoại.</li>
                    <li class="mb-2">Lương nhân viên được tính dựa trên phần trăm giá trị chuyến xe.</li>
                    <li class="mb-2">Tài xế được hưởng 10% giá trị chuyến xe.</li>
                    <li class="mb-2">Phụ xe được hưởng 5% giá trị chuyến xe.</li>
                    <li class="mb-2">Có thể xem chi tiết lương của từng nhân viên theo tháng và năm.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý xe">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Mỗi xe cần có biển số xe duy nhất.</li>
                    <li class="mb-2">Biển số xe được hiển thị theo định dạng đặc biệt trong danh sách xe.</li>
                    <li class="mb-2">Cần cập nhật ngày đăng kiểm để theo dõi thời hạn đăng kiểm.</li>
                    <li class="mb-2">Xe có thể được chọn khi tạo chuyến xe mới.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Xác thực và bảo mật">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Hệ thống sử dụng xác thực Firebase để đảm bảo an toàn.</li>
                    <li class="mb-2">Không có trang đăng ký trong ứng dụng.</li>
                    <li class="mb-2">Trang đăng nhập có nút để sao chép URL đến trang nhập chuyến xe công khai.</li>
                    <li class="mb-2">Các trang yêu cầu xác thực sẽ tự động chuyển hướng đến trang đăng nhập nếu người dùng chưa đăng nhập.</li>
                </ul>
            </AccordionTab>
        </Accordion>
    </div>
</template>

<style scoped>
.card {
    background-color: var(--surface-card);
    padding: 2rem;
    border-radius: 10px;
    margin-bottom: 1rem;
}

.p-invalid {
    @apply border-red-500;
}
</style>
