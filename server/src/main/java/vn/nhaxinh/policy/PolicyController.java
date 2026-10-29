package vn.nhaxinh.policy;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.policy.PolicyDtos.PolicyResponse;

@RestController
@RequestMapping(BaseController.API_V1 + "/policies")
public class PolicyController extends BaseController {
    private final PolicyService policyService;

    public PolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping
    public PolicyContentResponse getPolicy() {
        return policyService.getPolicy();
    }

    @GetMapping("/all")
    public ResponseEntity<List<PolicyResponse>> getAllPublishedPolicies() {
        return ResponseEntity.ok(policyService.getPublishedPolicies());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PolicyResponse> getPolicyBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(policyService.getPolicyBySlug(slug));
    }

    @PutMapping
    public PolicyContentResponse updatePolicy(@Valid @RequestBody PolicyContentRequest request) {
        return policyService.updatePolicy(request);
    }
}
