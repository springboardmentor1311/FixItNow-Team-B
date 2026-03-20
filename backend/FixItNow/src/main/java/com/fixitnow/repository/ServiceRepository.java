package com.fixitnow.repository;

import com.fixitnow.model.Service;
import com.fixitnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long>, JpaSpecificationExecutor<Service> {

    List<Service> findByProvider(User provider);

    List<Service> findByProviderId(Long providerId);

    List<Service> findByLocation(String location);

    List<Service> findByCategory(String category);
}
