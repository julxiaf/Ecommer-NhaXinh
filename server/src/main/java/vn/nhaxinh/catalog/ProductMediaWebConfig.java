package vn.nhaxinh.catalog;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class ProductMediaWebConfig implements WebMvcConfigurer {

    private final ProductMediaStorage mediaStorage;

    public ProductMediaWebConfig(ProductMediaStorage mediaStorage) {
        this.mediaStorage = mediaStorage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = mediaStorage.getStorageDirectory().toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/media/products/**")
                .addResourceLocations(location);

        String uploadsLocation = Path.of("uploads").toAbsolutePath().normalize().toUri().toString();
        if (!uploadsLocation.endsWith("/")) {
            uploadsLocation += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsLocation, "file:uploads/", "file:../uploads/", "classpath:/static/uploads/");
    }
}
