package com.fixitnow;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@Slf4j
@SpringBootApplication
@ComponentScan(basePackages = "com.fixitnow")
public class FixItNowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FixItNowBackendApplication.class, args);
        log.info("FixItNow Backend Application started successfully");
    }
}
