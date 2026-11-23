import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

URL = "http://localhost:5173/login"


@pytest.fixture
def driver():
    d = webdriver.Chrome()
    d.get(URL)
    yield d
    d.quit()


def login(driver, username, password):
    username_input = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "login-username"))
    )
    username_input.clear()
    username_input.send_keys(username)

    password_input = driver.find_element(By.ID, "login-password")
    password_input.clear()
    password_input.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()


@pytest.mark.parametrize(
    "username,password,expected",
    [
        ("kader.mlt01", "123456", "/dashboard"),
        ("admin", "123456", "/organisasi"),
        ("kader.mlt01", "salah123", "error"),
        ("user_tidak_ada", "123456", "error"),
        ("", "123456", "required"),
    ],
    ids=["TC-01", "TC-02", "TC-03", "TC-04", "TC-05"],
)
def test_login(driver, username, password, expected):
    login(driver, username, password)

    if expected.startswith("/"):
        WebDriverWait(driver, 10).until(EC.url_contains(expected))
        assert expected in driver.current_url
    elif expected == "error":
        pesan = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "[role='alert']"))
        ).text
        assert "Username atau password salah." in pesan
        assert "/login" in driver.current_url
    elif expected == "required":
        username_input = driver.find_element(By.ID, "login-username")
        validation_msg = username_input.get_attribute("validationMessage")
        assert validation_msg != ""
        assert "/login" in driver.current_url
