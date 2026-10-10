package smartattendLocal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable()) // disable CSRF for JS fetch
                .cors(cors -> {})             // enable CORS
                .authorizeHttpRequests(auth -> auth
                        // Public routes
                        .requestMatchers(
                                "/",
                                "/status",
                                "/index.html",
                                "/body/login.html",
                                "/body/registration.html",
                                "/body/adminLogin.html",
                                "/body/adminDashboard.html",
                                "/style/**",
                                "/assets/**",
                                "/script/**",
                                "/js/**",
                                "/teacher/login",
                                "/teacher/forgot-password",
                                "/teacher/check-email",
                                "/teacher/verify-otp",
                                "/teacher/reset-password",
                                "/teacher/add",
                                "/teacher/register",
                                "/students/all",
                                "/admin/login"
                        ).permitAll()

                        // Teacher-only routes
                        .requestMatchers(
                                "/teacher/dashboard/**",
                                "/students/my-students",
                                "/students/count/my-students",
                                "/students/{cardId}/add",
                                "/students/{cardId}/students",
                                "/students/import",
                                "/students/import/template",
                                "/cards/**"
                        ).hasRole("TEACHER")

                        // Admin-only routes
                        .requestMatchers(
                                "/admin/**"
                        ).hasAnyRole("ADMIN")

                        // Any other route requires authentication
                        .anyRequest().authenticated()
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                );

        return http.build();
    }

    // CORS configuration for local
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(Arrays.asList("*"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}