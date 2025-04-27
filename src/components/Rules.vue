<script setup>
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import { ref } from 'vue';

const title = ref('Quy tắc sử dụng hệ thống');
</script>

<template>
    <div class="card">
        <h1>{{ title }}</h1>
        <p class="text-lg mb-4">Dưới đây là các quy tắc và hướng dẫn sử dụng hệ thống quản lý chuyến xe. Vui lòng đọc kỹ để đảm bảo sử dụng hệ thống một cách hiệu quả.</p>

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
                    <li class="mb-2">Trang <strong>Thêm chuyến xe mới</strong> chỉ có thể truy cập từ trang <strong>Danh sách chuyến xe</strong>.</li>
                    <li class="mb-2">Khi thêm chuyến xe mới, cần nhập đầy đủ thông tin bắt buộc: ngày đi, điểm xuất phát, điểm đến, quãng đường, tài xế, khách hàng và biển số xe.</li>
                    <li class="mb-2">Chuyến xe được thêm từ trang quản trị sẽ có trạng thái <strong>APPROVED</strong> (Đã duyệt).</li>
                    <li class="mb-2">Chuyến xe được thêm từ trang công khai sẽ có trạng thái <strong>PENDING</strong> (Chờ duyệt).</li>
                    <li class="mb-2">Khi chuyến xe có trạng thái <strong>APPROVED</strong>, chi phí liên quan sẽ không thể chỉnh sửa.</li>
                    <li class="mb-2">Khi xóa chuyến xe, hệ thống sẽ tự động xóa các chi phí liên quan.</li>
                    <li class="mb-2">Khi thêm chuyến xe mới, số dư tạm ứng của tài xế sẽ không được cập nhật ngay lập tức; số dư chỉ được cập nhật khi chuyến xe được duyệt.</li>
                    <li class="mb-2">Việc duyệt chuyến xe được thực hiện trực tiếp từ trang <strong>Danh sách chuyến xe</strong> bằng nút hành động, không cần trang riêng biệt.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý chi phí và tạm ứng">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Cập nhật số dư tạm ứng sẽ được kích hoạt trong các trường hợp sau:</li>
                    <ul class="list-disc pl-6 mb-2">
                        <li>Khi thêm chuyến xe có chi phí</li>
                        <li>Khi chỉnh sửa chi phí chuyến xe</li>
                        <li>Khi tăng số dư tạm ứng</li>
                        <li>Khi thêm chi phí mới ngoài chuyến xe</li>
                    </ul>
                    <li class="mb-2">Chi phí chuyến xe bao gồm: chi phí CSGT, chi phí cầu đường, chi phí ăn uống, chi phí xăng dầu và chi phí sửa chữa.</li>
                    <li class="mb-2">Khi thêm chi phí, số dư tạm ứng của nhân viên sẽ giảm tương ứng.</li>
                    <li class="mb-2">Khi thêm tiền tạm ứng, số dư tạm ứng của nhân viên sẽ tăng lên.</li>
                    <li class="mb-2">Số dư tạm ứng hiển thị với chữ "đang giữ" khi số dư lớn hơn 0.</li>
                    <li class="mb-2">Khi duyệt chuyến xe, hệ thống sẽ tự động tạo chi phí và cập nhật số dư tạm ứng của tài xế.</li>
                    <li class="mb-2">Số dư tạm ứng được lưu trong bộ sưu tập 'balance' riêng biệt, chỉ chứa các giá trị dương, và mỗi bản ghi bao gồm tên đầy đủ của nhân viên, số dư và ngày cập nhật.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý nhân viên">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Trang <strong>Thêm nhân viên mới</strong> chỉ có thể truy cập từ trang <strong>Danh sách nhân viên</strong>.</li>
                    <li class="mb-2">Khi thêm nhân viên mới, cần nhập đầy đủ thông tin bắt buộc: họ và tên, tên ngắn, số điện thoại.</li>
                    <li class="mb-2">Tên ngắn của nhân viên được sử dụng để quản lý số dư tạm ứng.</li>
                    <li class="mb-2">Nhân viên có thể được chọn làm tài xế hoặc phụ xe trong chuyến đi.</li>
                    <li class="mb-2">Danh sách tài xế và phụ xe được lấy từ cùng một nguồn dữ liệu nhân viên.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý xe">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Trang <strong>Thêm xe mới</strong> chỉ có thể truy cập từ trang <strong>Danh sách xe</strong>.</li>
                    <li class="mb-2">Biển số xe được hiển thị chính xác như đã lưu trong cơ sở dữ liệu, không có định dạng đặc biệt.</li>
                    <li class="mb-2">Trường biển số xe trong form chuyến đi được hiển thị dưới dạng danh sách dropdown.</li>
                    <li class="mb-2">Sau khi thêm xe mới, hệ thống sẽ tự động chuyển về trang danh sách xe.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Quản lý khách hàng">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Trang <strong>Thêm khách hàng mới</strong> chỉ có thể truy cập từ trang <strong>Danh sách khách hàng</strong>.</li>
                    <li class="mb-2">Trường khách hàng trong form chuyến đi được hiển thị dưới dạng danh sách dropdown với định dạng "tên người đại diện - tên công ty".</li>
                    <li class="mb-2">Thông tin khách hàng được sử dụng trong mô tả chi phí chuyến đi.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Lọc và tìm kiếm">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Trang <strong>Danh sách chuyến xe</strong> có khả năng lọc theo các tiêu chí sau:</li>
                    <ul class="list-disc pl-6 mb-2">
                        <li>Tên tài xế</li>
                        <li>Tên khách hàng</li>
                        <li>Khoảng thời gian (từ ngày đến ngày)</li>
                        <li>Trạng thái chuyến xe</li>
                    </ul>
                    <li class="mb-2">Bộ lọc được sắp xếp theo chiều dọc để có giao diện đẹp hơn.</li>
                    <li class="mb-2">Bộ chọn ngày và bộ lọc được sắp xếp trên cùng một dòng để có giao diện đẹp hơn.</li>
                    <li class="mb-2">Bộ lọc ngày sử dụng khoảng ngày thay vì chọn một ngày cố định.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Định dạng và hiển thị">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Định dạng ngày tháng: dd/MM/yyyy (ngày/tháng/năm).</li>
                    <li class="mb-2">Mô tả chi phí chuyến đi bao gồm: điểm xuất phát, điểm đến, ngày đi và tên khách hàng.</li>
                    <li class="mb-2">Danh sách số dư tạm ứng hiển thị: tên nhân viên, số dư, ngày cập nhật cuối và ngày cập nhật.</li>
                    <li class="mb-2">Nút xóa được đặt ở trang chỉnh sửa, không ở trang danh sách, căn lề trái, kích thước nhỏ và có hộp thoại xác nhận trước khi xóa.</li>
                    <li class="mb-2">Nút xóa, hủy và lưu được đặt trên cùng một dòng trong trang chỉnh sửa, với nút xóa căn lề trái và nút hủy/lưu căn lề phải.</li>
                    <li class="mb-2">Nút duyệt và chỉnh sửa được thiết kế khác biệt về mặt hình ảnh và được đặt cách xa nhau để tránh nhấp nhầm.</li>
                    <li class="mb-2">Các nút có chiều rộng giảm để tránh cuộn dọc trong bảng.</li>
                </ul>
            </AccordionTab>

            <AccordionTab header="Bố cục và điều hướng">
                <ul class="list-disc pl-6 mb-4">
                    <li class="mb-2">Thanh bên được thiết kế hẹp hơn và khung chính rộng hơn để tối ưu không gian hiển thị.</li>
                    <li class="mb-2">Trang <strong>Quy tắc sử dụng hệ thống</strong> có thể truy cập từ đầu danh sách menu.</li>
                    <li class="mb-2">Khi điều hướng khỏi trang chỉnh sửa hoặc thêm chuyến xe, hệ thống sẽ hiển thị hộp thoại xác nhận để tránh mất dữ liệu.</li>
                    <li class="mb-2">Các trang thêm mới (thêm xe, thêm khách hàng, thêm nhân viên, thêm chuyến xe) chỉ có thể truy cập từ trang danh sách tương ứng.</li>
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
</style>
