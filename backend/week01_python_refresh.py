print("CourseHub - Buoi 1")

students = [
    {"id": "22000001", "name": "Nguyen Minh Anh", "major": "KHDL"},
    {"id": "22000002", "name": "Tran Duc Long", "major": "KHDL"},
]

courses = [
    {
        "code": "INT2204",
        "name": "Co so du lieu web va he thong thong tin",
        "capacity": 3,
        "enrolled":2,
    },
    {
        "code": "INT2205",
        "name": "Khai pha du lieu",
        "capacity" : 2, 
        "enrolled": 2,
    },
]

enrollments = [
    {"student_id": "22000001", "course_code": "INT2204"}
]

for course in courses:
    remaining = course["capacity"] - course["enrolled"]
    print(course["code"], "- con", remaining, "cho")


def find_course(course_code):
    for course in courses:
        if course["code"] == course_code:
            return course
    return None

print(find_course("INT2204"))


def can_enroll(student_id, course_code):
    course = find_course(course_code=course_code)

    if course is None:
        return False, "Hoc phan khong ton tai"

    if course["enrolled"] >= course["capacity"]:
        return False, "Lop da du so luong"

    duplicate = any(
        item["student_id"] == student_id and item["course_code"] == course_code
        for item in enrollments
    )

    if duplicate:
        return False, "Sinh vien da dang ki hocj phan nay"

    return True, "Co the dang ki hoc phan nay"

print(can_enroll("22000002", "INT2204"))

# try - except

try:
    limit = int(input("Nhap so luong hoc phan muon hien thi: "))
    print(course[:limit])
except ValueError:
    print("So luong phai la so nguyen")

# 8. Ham tim kiem hoc phan

def search_course(keyword: str):
    normalized = keyword.strip().lower()
    results = []

    for course in courses:
        code = course["code"].lower()
        name = course["name"].lower()

        if normalized in code or normalized in name:
            results.append(course)

    return results

print(search_course("web"))