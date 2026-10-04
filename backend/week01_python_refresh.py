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

    duplicate = any(
        item["student_id"] == student_id and item["course_code"] == course_code
        for item in enrollments
    )
    if duplicate:
            return False, "Sinh vien da dang ki hoc phan nay"
    
    if course["enrolled"] >= course["capacity"]:
        return False, "Lop da du so luong"

    

    

    return True, "Co the dang ki hoc phan nay"

print(can_enroll("22000002", "INT2204"))

# try - except

try:
    limit = int(input("Nhap so luong hoc phan muon hien thi: "))
    print(courses[:limit])
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


# Bai tap tu luyen

def enroll_student(student_id: str, course_code: str):
    # kiem tra sinh vien ton tai
    tontai_student = any(
        student["id"] == student_id for student in students
    )

    if not tontai_student:
        return "Khong ton tai sinh vien"


    is_can_enroll, message = can_enroll(student_id=student_id, course_code=course_code)

    if is_can_enroll:
        # cap nhat enroll hoc phan
        for course in courses:
            if course["code"] == course_code:
                course["enrolled"] += 1
                break

        # add sinh vien vao 
        enrollments.append({"student_id": student_id, "course_code": course_code})

    return message


# taoj test

print(enroll_student("22000002", "INT2204")) # thanh cong
print(enroll_student("22000002", "INT2205")) # lop day
print(enroll_student("22000002", "INT2222")) # ma hoc phan k ton tai
print(enroll_student("22000003", "INT2204")) # khong ton taij sinh vien
print(enroll_student("22000001", "INT2204")) # dang ki trung

