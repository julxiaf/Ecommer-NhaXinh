package vn.nhaxinh.policy.policy;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import vn.nhaxinh.policy.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyServiceTest {
    @Mock
    private PolicyPageRepository     repository;

    private PolicyService service;
    private PolicyPage page;

    @BeforeEach
    void setUp() {
        service = new PolicyService(repository);
        page = new PolicyPage();
        page.setId(1);
        page.setTitle("Chính sách cũ");
        page.setIntroduction("Giới thiệu cũ");
        page.setPurchasePolicy("Mua hàng cũ");
        page.setReturnPolicy("Đổi trả cũ");
        when(repository.findById(1)).thenReturn(Optional.of(page));
    }

    @Test
    void updatesAndTrimsAllEditablePolicyContent() {
        when(repository.save(page)).thenReturn(page);
        PolicyContentRequest request = new PolicyContentRequest(
                "  Chính sách mới  ",
                "  Giới thiệu mới  ",
                "  Mua hàng mới  ",
                "  Đổi trả mới  "
        );

        PolicyContentResponse result = service.updatePolicy(request);

        assertThat(result.title()).isEqualTo("Chính sách mới");
        assertThat(result.introduction()).isEqualTo("Giới thiệu mới");
        assertThat(result.purchasePolicy()).isEqualTo("Mua hàng mới");
        assertThat(result.returnPolicy()).isEqualTo("Đổi trả mới");
        verify(repository).save(page);
    }
}
