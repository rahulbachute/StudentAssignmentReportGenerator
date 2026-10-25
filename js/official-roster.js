/**
 * Standalone Student Assignment Report Generator
 * File: js/official-roster.js
 * 
 * Official Attendance Roll-Call Roster:
 * - Exactly 216 students across TE-A (71), TE-B (75), and TE-C (70).
 * - Incorporates official student names, roll numbers, and divisions.
 * - Encapsulates approved student name mappings.
 * - Flags duplicate roll numbers in TE-B for name verification.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OfficialRoster = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIVISIONS = ['TE-A', 'TE-B', 'TE-C'];

  // Five duplicate roll numbers in TE-B noted in official attendance workbook (Note 9)
  var DUPLICATE_ROLLS_TE_B = ['530602', '530606', '530608', '530624', '530652'];

  // Official Roster containing exactly 216 students
  var STUDENTS = [
  {
    "srNo": 1,
    "rollNumber": "530501",
    "studentName": "Adhane Prithviraj Jitendra",
    "division": "TE-A",
    "id": "TE-A-530501-1"
  },
  {
    "srNo": 2,
    "rollNumber": "530502",
    "studentName": "Aditi S Nair",
    "division": "TE-A",
    "id": "TE-A-530502-2"
  },
  {
    "srNo": 3,
    "rollNumber": "530503",
    "studentName": "Aditya Popat Waikar",
    "division": "TE-A",
    "id": "TE-A-530503-3"
  },
  {
    "srNo": 4,
    "rollNumber": "530504",
    "studentName": "Akshata Shashikant Shinde",
    "division": "TE-A",
    "id": "TE-A-530504-4"
  },
  {
    "srNo": 5,
    "rollNumber": "530505",
    "studentName": "Akshay Anilappa Jirvankar",
    "division": "TE-A",
    "id": "TE-A-530505-5"
  },
  {
    "srNo": 6,
    "rollNumber": "530506",
    "studentName": "Ambatwar Akanksha",
    "division": "TE-A",
    "id": "TE-A-530506-6"
  },
  {
    "srNo": 7,
    "rollNumber": "530507",
    "studentName": "Amrale Pranav Shankar",
    "division": "TE-A",
    "id": "TE-A-530507-7"
  },
  {
    "srNo": 8,
    "rollNumber": "530508",
    "studentName": "Andhale Suraj Sanjay",
    "division": "TE-A",
    "id": "TE-A-530508-8"
  },
  {
    "srNo": 9,
    "rollNumber": "530509",
    "studentName": "Ashish Deepak Bansode",
    "division": "TE-A",
    "id": "TE-A-530509-9"
  },
  {
    "srNo": 10,
    "rollNumber": "530510",
    "studentName": "Attar Ayan Asif",
    "division": "TE-A",
    "id": "TE-A-530510-10"
  },
  {
    "srNo": 11,
    "rollNumber": "530511",
    "studentName": "Ayush Arun Warkad",
    "division": "TE-A",
    "id": "TE-A-530511-11"
  },
  {
    "srNo": 12,
    "rollNumber": "530512",
    "studentName": "Bansode Yash Devidas",
    "division": "TE-A",
    "id": "TE-A-530512-12"
  },
  {
    "srNo": 13,
    "rollNumber": "530513",
    "studentName": "Bapte Atharva Santosh",
    "division": "TE-A",
    "id": "TE-A-530513-13"
  },
  {
    "srNo": 14,
    "rollNumber": "530514",
    "studentName": "Bhagure Gaurav Chandrakant",
    "division": "TE-A",
    "id": "TE-A-530514-14"
  },
  {
    "srNo": 15,
    "rollNumber": "530515",
    "studentName": "Bhalge Nidhee Nilanjan",
    "division": "TE-A",
    "id": "TE-A-530515-15"
  },
  {
    "srNo": 16,
    "rollNumber": "530516",
    "studentName": "Bhandari Aishwarya Sachin",
    "division": "TE-A",
    "id": "TE-A-530516-16"
  },
  {
    "srNo": 17,
    "rollNumber": "530517",
    "studentName": "Bhise Soham Santosh",
    "division": "TE-A",
    "id": "TE-A-530517-17"
  },
  {
    "srNo": 18,
    "rollNumber": "530518",
    "studentName": "Bhore Omkar Sunil",
    "division": "TE-A",
    "id": "TE-A-530518-18"
  },
  {
    "srNo": 19,
    "rollNumber": "530519",
    "studentName": "Bhosale Dnyanesh Tanaji",
    "division": "TE-A",
    "id": "TE-A-530519-19"
  },
  {
    "srNo": 20,
    "rollNumber": "530520",
    "studentName": "Bhosale Suraj Rohidas",
    "division": "TE-A",
    "id": "TE-A-530520-20"
  },
  {
    "srNo": 21,
    "rollNumber": "530521",
    "studentName": "Biradar Ragini Iranna",
    "division": "TE-A",
    "id": "TE-A-530521-21"
  },
  {
    "srNo": 22,
    "rollNumber": "530522",
    "studentName": "Bombale Om Shivaji",
    "division": "TE-A",
    "id": "TE-A-530522-22"
  },
  {
    "srNo": 23,
    "rollNumber": "530523",
    "studentName": "Bomble Sudarshan Somnath",
    "division": "TE-A",
    "id": "TE-A-530523-23"
  },
  {
    "srNo": 24,
    "rollNumber": "530524",
    "studentName": "Chabukswar Bhagyoday Vishwanath",
    "division": "TE-A",
    "id": "TE-A-530524-24"
  },
  {
    "srNo": 25,
    "rollNumber": "530525",
    "studentName": "Borse Tanuja Bharat",
    "division": "TE-A",
    "id": "TE-A-530525-25"
  },
  {
    "srNo": 26,
    "rollNumber": "530526",
    "studentName": "Chavan Dikshant Nilesh",
    "division": "TE-A",
    "id": "TE-A-530526-26"
  },
  {
    "srNo": 27,
    "rollNumber": "530527",
    "studentName": "Budhnar Jayesh Bharat",
    "division": "TE-A",
    "id": "TE-A-530527-27"
  },
  {
    "srNo": 28,
    "rollNumber": "530528",
    "studentName": "Chandgave Nageshwar Baliram",
    "division": "TE-A",
    "id": "TE-A-530528-28"
  },
  {
    "srNo": 29,
    "rollNumber": "530529",
    "studentName": "Chaudhari Atharva Dattatray",
    "division": "TE-A",
    "id": "TE-A-530529-29"
  },
  {
    "srNo": 30,
    "rollNumber": "530530",
    "studentName": "Vedpathak Parth Prashant",
    "division": "TE-A",
    "id": "TE-A-530530-30"
  },
  {
    "srNo": 31,
    "rollNumber": "530531",
    "studentName": "Chavan Sakshi Sanjay",
    "division": "TE-A",
    "id": "TE-A-530531-31"
  },
  {
    "srNo": 32,
    "rollNumber": "530532",
    "studentName": "Chhajed Vedansh Poonamkumar",
    "division": "TE-A",
    "id": "TE-A-530532-32"
  },
  {
    "srNo": 33,
    "rollNumber": "530533",
    "studentName": "Daundkar Sairaj Sunil",
    "division": "TE-A",
    "id": "TE-A-530533-33"
  },
  {
    "srNo": 34,
    "rollNumber": "530534",
    "studentName": "Davanpelli Sanskruti Rajendra",
    "division": "TE-A",
    "id": "TE-A-530534-34"
  },
  {
    "srNo": 35,
    "rollNumber": "530535",
    "studentName": "Nilay Kiran Bhandari",
    "division": "TE-A",
    "id": "TE-A-530535-35"
  },
  {
    "srNo": 36,
    "rollNumber": "530536",
    "studentName": "Deshmukh Saheel Yogesh",
    "division": "TE-A",
    "id": "TE-A-530536-36"
  },
  {
    "srNo": 37,
    "rollNumber": "530537",
    "studentName": "Dhage Yuvraj Sahebrao",
    "division": "TE-A",
    "id": "TE-A-530537-37"
  },
  {
    "srNo": 38,
    "rollNumber": "530538",
    "studentName": "Dhakane Shubham Anil",
    "division": "TE-A",
    "id": "TE-A-530538-38"
  },
  {
    "srNo": 39,
    "rollNumber": "530539",
    "studentName": "Dhole Prajwal Pramod",
    "division": "TE-A",
    "id": "TE-A-530539-39"
  },
  {
    "srNo": 40,
    "rollNumber": "530540",
    "studentName": "Dhole Sahil Sunil",
    "division": "TE-A",
    "id": "TE-A-530540-40"
  },
  {
    "srNo": 41,
    "rollNumber": "530541",
    "studentName": "Dhotre Tanmay Vijay",
    "division": "TE-A",
    "id": "TE-A-530541-41"
  },
  {
    "srNo": 42,
    "rollNumber": "530542",
    "studentName": "Diggi Megha Vijaykumar",
    "division": "TE-A",
    "id": "TE-A-530542-42"
  },
  {
    "srNo": 43,
    "rollNumber": "530543",
    "studentName": "Dofe Nagesh Sandip",
    "division": "TE-A",
    "id": "TE-A-530543-43"
  },
  {
    "srNo": 44,
    "rollNumber": "530544",
    "studentName": "Dole Nitin Samadhan",
    "division": "TE-A",
    "id": "TE-A-530544-44"
  },
  {
    "srNo": 45,
    "rollNumber": "530545",
    "studentName": "Dudhabaware Shruti Vijay",
    "division": "TE-A",
    "id": "TE-A-530545-45"
  },
  {
    "srNo": 46,
    "rollNumber": "530546",
    "studentName": "Dukare Snehal Santosh",
    "division": "TE-A",
    "id": "TE-A-530546-46"
  },
  {
    "srNo": 47,
    "rollNumber": "530547",
    "studentName": "Durgude Avishkar Vitthal",
    "division": "TE-A",
    "id": "TE-A-530547-47"
  },
  {
    "srNo": 48,
    "rollNumber": "530548",
    "studentName": "Gaikwad Namrata Anil",
    "division": "TE-A",
    "id": "TE-A-530548-48"
  },
  {
    "srNo": 49,
    "rollNumber": "530549",
    "studentName": "Gaikwad Shubhangi Vijay",
    "division": "TE-A",
    "id": "TE-A-530549-49"
  },
  {
    "srNo": 50,
    "rollNumber": "530550",
    "studentName": "Gangurde Rasika Rajendra",
    "division": "TE-A",
    "id": "TE-A-530550-50"
  },
  {
    "srNo": 51,
    "rollNumber": "530551",
    "studentName": "Ganorkar Prathmesh Dipak",
    "division": "TE-A",
    "id": "TE-A-530551-51"
  },
  {
    "srNo": 52,
    "rollNumber": "530552",
    "studentName": "Golekar Krushna Mahadev",
    "division": "TE-A",
    "id": "TE-A-530552-52"
  },
  {
    "srNo": 53,
    "rollNumber": "530553",
    "studentName": "Gore Poonam Prakash",
    "division": "TE-A",
    "id": "TE-A-530553-53"
  },
  {
    "srNo": 54,
    "rollNumber": "530554",
    "studentName": "Gore Yash Gangaram",
    "division": "TE-A",
    "id": "TE-A-530554-54"
  },
  {
    "srNo": 55,
    "rollNumber": "530555",
    "studentName": "Gujar Darshan Kundan",
    "division": "TE-A",
    "id": "TE-A-530555-55"
  },
  {
    "srNo": 56,
    "rollNumber": "530556",
    "studentName": "Gujar Karan Naresh",
    "division": "TE-A",
    "id": "TE-A-530556-56"
  },
  {
    "srNo": 57,
    "rollNumber": "530557",
    "studentName": "Moeen Fakruddin Dodamani Shaikh",
    "division": "TE-A",
    "id": "TE-A-530557-57"
  },
  {
    "srNo": 58,
    "rollNumber": "530558",
    "studentName": "Saroj Jatin Jeetlal",
    "division": "TE-A",
    "id": "TE-A-530558-58"
  },
  {
    "srNo": 59,
    "rollNumber": "530559",
    "studentName": "Giri Manthan Subhash",
    "division": "TE-A",
    "id": "TE-A-530559-59"
  },
  {
    "srNo": 60,
    "rollNumber": "530560",
    "studentName": "Upadhyay Sanketkumar Gyaneshwar",
    "division": "TE-A",
    "id": "TE-A-530560-60"
  },
  {
    "srNo": 61,
    "rollNumber": "530561",
    "studentName": "Jadhav Srushti Pandurang",
    "division": "TE-A",
    "id": "TE-A-530561-61"
  },
  {
    "srNo": 62,
    "rollNumber": "530562",
    "studentName": "Bhalerao Poonam Sanjay",
    "division": "TE-A",
    "id": "TE-A-530562-62"
  },
  {
    "srNo": 63,
    "rollNumber": "530563",
    "studentName": "BHOR TANUJA BHARAT",
    "division": "TE-A",
    "id": "TE-A-530563-63",
  },
  {
    "srNo": 64,
    "rollNumber": "530564",
    "studentName": "Gopale Payal Subhash (Reassigned to TE-B 530653)",
    "division": "TE-A",
    "id": "TE-A-530564-64"
  },
  {
    "srNo": 65,
    "rollNumber": "530565",
    "studentName": "Gopchade Parvati Shesherao",
    "division": "TE-A",
    "id": "TE-A-530565-65"
  },
  {
    "srNo": 66,
    "rollNumber": "530566",
    "studentName": "Narote Prathamesh Purushottam",
    "division": "TE-A",
    "id": "TE-A-530566-66"
  },
  {
    "srNo": 67,
    "rollNumber": "530567",
    "studentName": "Thakur Yash Rohidas",
    "division": "TE-A",
    "id": "TE-A-530567-67"
  },
  {
    "srNo": 68,
    "rollNumber": "530568",
    "studentName": "Rohit Deepak Dhotre",
    "division": "TE-A",
    "id": "TE-A-530568-68"
  },
  {
    "srNo": 69,
    "rollNumber": "530569",
    "studentName": "Bhumi Rahul Ohal",
    "division": "TE-A",
    "id": "TE-A-530569-69"
  },
  {
    "srNo": 70,
    "rollNumber": "530570",
    "studentName": "Tapkir Om Bapusaheb",
    "division": "TE-A",
    "id": "TE-A-530570-70"
  },
  {
    "srNo": 71,
    "rollNumber": "530571",
    "studentName": "Borkar Snehit Satyavijay",
    "division": "TE-A",
    "id": "TE-A-530571-71"
  },
  {
    "srNo": 1,
    "rollNumber": "530601",
    "studentName": "Gutal Sagar Santosh",
    "division": "TE-B",
    "id": "TE-B-530601-1"
  },
  {
    "srNo": 2,
    "rollNumber": "530602",
    "studentName": "Waghmare Ganesh Subhash",
    "division": "TE-B",
    "id": "TE-B-530602-2"
  },
  {
    "srNo": 3,
    "rollNumber": "530603",
    "studentName": "Hajare Swaraj Ramdas",
    "division": "TE-B",
    "id": "TE-B-530603-3"
  },
  {
    "srNo": 4,
    "rollNumber": "530604",
    "studentName": "Awatade Amol Abasaheb",
    "division": "TE-B",
    "id": "TE-B-530604-4"
  },
  {
    "srNo": 5,
    "rollNumber": "530605",
    "studentName": "Hatagale Ganesh Pradeep",
    "division": "TE-B",
    "id": "TE-B-530605-5"
  },
  {
    "srNo": 6,
    "rollNumber": "530606",
    "studentName": "Jagruti Vijay kakade",
    "division": "TE-B",
    "id": "TE-B-530606-6"
  },
  {
    "srNo": 7,
    "rollNumber": "530607",
    "studentName": "Hiwarale Paritosh Anil",
    "division": "TE-B",
    "id": "TE-B-530607-7"
  },
  {
    "srNo": 8,
    "rollNumber": "530608",
    "studentName": "Kamble Mayur Santosh",
    "division": "TE-B",
    "id": "TE-B-530608-8"
  },
  {
    "srNo": 9,
    "rollNumber": "530609",
    "studentName": "Jadhav Mayur Santosh",
    "division": "TE-B",
    "id": "TE-B-530609-9"
  },
  {
    "srNo": 10,
    "rollNumber": "530610",
    "studentName": "Jadhav Onkar Umesh",
    "division": "TE-B",
    "id": "TE-B-530610-10"
  },
  {
    "srNo": 11,
    "rollNumber": "530611",
    "studentName": "Jadhav Prathmesh Durgadas",
    "division": "TE-B",
    "id": "TE-B-530611-11"
  },
  {
    "srNo": 12,
    "rollNumber": "530612",
    "studentName": "Jahagirdar Janhvi Sunil",
    "division": "TE-B",
    "id": "TE-B-530612-12"
  },
  {
    "srNo": 13,
    "rollNumber": "530613",
    "studentName": "Jamdhade Rushikesh Sandeep",
    "division": "TE-B",
    "id": "TE-B-530613-13"
  },
  {
    "srNo": 14,
    "rollNumber": "530614",
    "studentName": "Janjire Abhishek Keshav",
    "division": "TE-B",
    "id": "TE-B-530614-14"
  },
  {
    "srNo": 15,
    "rollNumber": "530615",
    "studentName": "Javanjal Abhishek Ram",
    "division": "TE-B",
    "id": "TE-B-530615-15"
  },
  {
    "srNo": 16,
    "rollNumber": "530616",
    "studentName": "Sutar Kartik Rajendra",
    "division": "TE-B",
    "id": "TE-B-530616-16"
  },
  {
    "srNo": 17,
    "rollNumber": "530617",
    "studentName": "Jondhale Anuj Shivaji",
    "division": "TE-B",
    "id": "TE-B-530617-17"
  },
  {
    "srNo": 18,
    "rollNumber": "530618",
    "studentName": "Kakade Bhumi Ashok",
    "division": "TE-B",
    "id": "TE-B-530618-18"
  },
  {
    "srNo": 19,
    "rollNumber": "530619",
    "studentName": "Kakade Om Gahininath",
    "division": "TE-B",
    "id": "TE-B-530619-19"
  },
  {
    "srNo": 20,
    "rollNumber": "530620",
    "studentName": "Sahil Subhash Chavan",
    "division": "TE-B",
    "id": "TE-B-530620-20"
  },
  {
    "srNo": 21,
    "rollNumber": "530621",
    "studentName": "Kamble Vidhan Harish",
    "division": "TE-B",
    "id": "TE-B-530621-21"
  },
  {
    "srNo": 22,
    "rollNumber": "530622",
    "studentName": "Karande Sanjay Santosh",
    "division": "TE-B",
    "id": "TE-B-530622-22"
  },
  {
    "srNo": 23,
    "rollNumber": "530623",
    "studentName": "Shubham Santosh Sable",
    "division": "TE-B",
    "id": "TE-B-530623-23"
  },
  {
    "srNo": 24,
    "rollNumber": "530624",
    "studentName": "Dev Raju Ithape",
    "division": "TE-B",
    "id": "TE-B-530624-24"
  },
  {
    "srNo": 25,
    "rollNumber": "530625",
    "studentName": "Khandare Dikshant Vijay",
    "division": "TE-B",
    "id": "TE-B-530625-25"
  },
  {
    "srNo": 26,
    "rollNumber": "530626",
    "studentName": "Kharade Onkar Anil",
    "division": "TE-B",
    "id": "TE-B-530626-26"
  },
  {
    "srNo": 27,
    "rollNumber": "530627",
    "studentName": "Aashish Dnyaneshwar Deore",
    "division": "TE-B",
    "id": "TE-B-530627-27"
  },
  {
    "srNo": 28,
    "rollNumber": "530628",
    "studentName": "Khilari Kiran Shankar",
    "division": "TE-B",
    "id": "TE-B-530628-28"
  },
  {
    "srNo": 29,
    "rollNumber": "530629",
    "studentName": "Khodal Trupti Tanhaji",
    "division": "TE-B",
    "id": "TE-B-530629-29"
  },
  {
    "srNo": 30,
    "rollNumber": "530630",
    "studentName": "Sanskar Kisan Kamble",
    "division": "TE-B",
    "id": "TE-B-530630-30",
  },
  {
    "srNo": 31,
    "rollNumber": "530631",
    "studentName": "Kolambkar Abhishek Vinod",
    "division": "TE-B",
    "id": "TE-B-530631-31"
  },
  {
    "srNo": 32,
    "rollNumber": "530632",
    "studentName": "Kotgire Aditya Rajkumar",
    "division": "TE-B",
    "id": "TE-B-530632-32"
  },
  {
    "srNo": 33,
    "rollNumber": "530633",
    "studentName": "Kute Harshad Bhausaheb",
    "division": "TE-B",
    "id": "TE-B-530633-33"
  },
  {
    "srNo": 34,
    "rollNumber": "530634",
    "studentName": "Lahare Sarthak Sandeep",
    "division": "TE-B",
    "id": "TE-B-530634-34"
  },
  {
    "srNo": 35,
    "rollNumber": "530635",
    "studentName": "Lakhe Swaraj Suresh",
    "division": "TE-B",
    "id": "TE-B-530635-35"
  },
  {
    "srNo": 36,
    "rollNumber": "530636",
    "studentName": "Mane Om Ankush",
    "division": "TE-B",
    "id": "TE-B-530636-36"
  },
  {
    "srNo": 37,
    "rollNumber": "530637",
    "studentName": "Manuel Ryan Anthony",
    "division": "TE-B",
    "id": "TE-B-530637-37"
  },
  {
    "srNo": 38,
    "rollNumber": "530638",
    "studentName": "Mate Utkarsh Dnyaneshwar",
    "division": "TE-B",
    "id": "TE-B-530638-38"
  },
  {
    "srNo": 39,
    "rollNumber": "530639",
    "studentName": "Nikam Omkar Shahaji",
    "division": "TE-B",
    "id": "TE-B-530639-39"
  },
  {
    "srNo": 40,
    "rollNumber": "530640",
    "studentName": "Mokate Nikita Arjun",
    "division": "TE-B",
    "id": "TE-B-530640-40"
  },
  {
    "srNo": 41,
    "rollNumber": "530641",
    "studentName": "More Satyajit Jaykumar",
    "division": "TE-B",
    "id": "TE-B-530641-41"
  },
  {
    "srNo": 42,
    "rollNumber": "530642",
    "studentName": "Morkhade Ajinkya Prashant",
    "division": "TE-B",
    "id": "TE-B-530642-42"
  },
  {
    "srNo": 43,
    "rollNumber": "530643",
    "studentName": "Mujawar Rida Samir",
    "division": "TE-B",
    "id": "TE-B-530643-43"
  },
  {
    "srNo": 44,
    "rollNumber": "530644",
    "studentName": "Mulik Avadhoot Shankar",
    "division": "TE-B",
    "id": "TE-B-530644-44"
  },
  {
    "srNo": 45,
    "rollNumber": "530645",
    "studentName": "Mullyamwar Sarthak Vinod",
    "division": "TE-B",
    "id": "TE-B-530645-45"
  },
  {
    "srNo": 46,
    "rollNumber": "530646",
    "studentName": "Nandedkar Shweta Topaji",
    "division": "TE-B",
    "id": "TE-B-530646-46"
  },
  {
    "srNo": 47,
    "rollNumber": "530647",
    "studentName": "Naphade Swarada Pankaj",
    "division": "TE-B",
    "id": "TE-B-530647-47"
  },
  {
    "srNo": 48,
    "rollNumber": "530648",
    "studentName": "Nikhil Verma",
    "division": "TE-B",
    "id": "TE-B-530648-48"
  },
  {
    "srNo": 49,
    "rollNumber": "530649",
    "studentName": "Pakhare Pratik Namdeorao",
    "division": "TE-B",
    "id": "TE-B-530649-49"
  },
  {
    "srNo": 50,
    "rollNumber": "530650",
    "studentName": "Palve Rohit Vilas",
    "division": "TE-B",
    "id": "TE-B-530650-50"
  },
  {
    "srNo": 51,
    "rollNumber": "530651",
    "studentName": "Panchal Ganesh Rajendra",
    "division": "TE-B",
    "id": "TE-B-530651-51"
  },
  {
    "srNo": 52,
    "rollNumber": "530652",
    "studentName": "Atharva Dattatray Gadekar",
    "division": "TE-B",
    "id": "TE-B-530652-52"
  },
  {
    "srNo": 53,
    "rollNumber": "530653",
    "studentName": "GOPALE PAYAL SUBHASH",
    "division": "TE-B",
    "id": "TE-B-530653-53",
  },
  {
    "srNo": 54,
    "rollNumber": "530654",
    "studentName": "Patil Kunal Prashant",
    "division": "TE-B",
    "id": "TE-B-530654-54"
  },
  {
    "srNo": 55,
    "rollNumber": "530655",
    "studentName": "Patil Manish Dilip",
    "division": "TE-B",
    "id": "TE-B-530655-55"
  },
  {
    "srNo": 56,
    "rollNumber": "530656",
    "studentName": "Patil Pranav Ramesh",
    "division": "TE-B",
    "id": "TE-B-530656-56"
  },
  {
    "srNo": 57,
    "rollNumber": "530657",
    "studentName": "Bundhe Mahesh Vishnu",
    "division": "TE-B",
    "id": "TE-B-530657-57"
  },
  {
    "srNo": 58,
    "rollNumber": "530658",
    "studentName": "Onkar Pandurang Sanap",
    "division": "TE-B",
    "id": "TE-B-530658-58"
  },
  {
    "srNo": 59,
    "rollNumber": "530659",
    "studentName": "Jadhav Ritesh Suresh",
    "division": "TE-B",
    "id": "TE-B-530659-59"
  },
  {
    "srNo": 60,
    "rollNumber": "530660",
    "studentName": "Tanay Rajesh Deshmukh",
    "division": "TE-B",
    "id": "TE-B-530660-60"
  },
  {
    "srNo": 61,
    "rollNumber": "530661",
    "studentName": "Wadekar Dimpal Arun",
    "division": "TE-B",
    "id": "TE-B-530661-61"
  },
  {
    "srNo": 62,
    "rollNumber": "530662",
    "studentName": "Kale Soniya Govindrao",
    "division": "TE-B",
    "id": "TE-B-530662-62"
  },
  {
    "srNo": 63,
    "rollNumber": "530663",
    "studentName": "Shaikh Khushi Nasir",
    "division": "TE-B",
    "id": "TE-B-530663-63"
  },
  {
    "srNo": 64,
    "rollNumber": "530664",
    "studentName": "Shaikh Simran Nasir",
    "division": "TE-B",
    "id": "TE-B-530664-64"
  },
  {
    "srNo": 65,
    "rollNumber": "530665",
    "studentName": "Gawari Aaditi Adinath",
    "division": "TE-B",
    "id": "TE-B-530665-65"
  },
  {
    "srNo": 66,
    "rollNumber": "530666",
    "studentName": "Mali Nilesh Ravindra",
    "division": "TE-B",
    "id": "TE-B-530666-66"
  },
  {
    "srNo": 67,
    "rollNumber": "530667",
    "studentName": "Shadab Harun Shaikh",
    "division": "TE-B",
    "id": "TE-B-530667-67"
  },
  {
    "srNo": 68,
    "rollNumber": "530668",
    "studentName": "Tonchar Parag Gangadas",
    "division": "TE-B",
    "id": "TE-B-530668-68"
  },
  {
    "srNo": 69,
    "rollNumber": "530669",
    "studentName": "Nikhil Tanaji Mane",
    "division": "TE-B",
    "id": "TE-B-530669-69"
  },
  {
    "srNo": 70,
    "rollNumber": "530670",
    "studentName": "Ankul Kumar",
    "division": "TE-B",
    "id": "TE-B-530670-70"
  },
  {
    "srNo": 71,
    "rollNumber": "530602",
    "studentName": "Hange Yash Gorakhnath",
    "division": "TE-B",
    "id": "TE-B-530602-71"
  },
  {
    "srNo": 72,
    "rollNumber": "530606",
    "studentName": "Hatole Shilratna Rajesh",
    "division": "TE-B",
    "id": "TE-B-530606-72"
  },
  {
    "srNo": 73,
    "rollNumber": "530608",
    "studentName": "Hrudesh Kumar Gouda",
    "division": "TE-B",
    "id": "TE-B-530608-73"
  },
  {
    "srNo": 74,
    "rollNumber": "530624",
    "studentName": "Kedar Anushka Ramdas",
    "division": "TE-B",
    "id": "TE-B-530624-74"
  },
  {
    "srNo": 75,
    "rollNumber": "530652",
    "studentName": "Panchal Sujit Datta",
    "division": "TE-B",
    "id": "TE-B-530652-75"
  },
  {
    "srNo": 1,
    "rollNumber": "530701",
    "studentName": "Jay Sudhir Dalal",
    "division": "TE-C",
    "id": "TE-C-530701-1"
  },
  {
    "srNo": 2,
    "rollNumber": "530702",
    "studentName": "Patil Shubham Ganpati",
    "division": "TE-C",
    "id": "TE-C-530702-2"
  },
  {
    "srNo": 3,
    "rollNumber": "530703",
    "studentName": "Patil Tanmay Vinid",
    "division": "TE-C",
    "id": "TE-C-530703-3"
  },
  {
    "srNo": 4,
    "rollNumber": "530704",
    "studentName": "Pawar Hrushikesh Deepak",
    "division": "TE-C",
    "id": "TE-C-530704-4"
  },
  {
    "srNo": 5,
    "rollNumber": "530705",
    "studentName": "Pawar Pratik Balaji",
    "division": "TE-C",
    "id": "TE-C-530705-5"
  },
  {
    "srNo": 6,
    "rollNumber": "530706",
    "studentName": "Pawar Sarthak Aaba",
    "division": "TE-C",
    "id": "TE-C-530706-6"
  },
  {
    "srNo": 7,
    "rollNumber": "530707",
    "studentName": "Pawar Shriraj Hanmant",
    "division": "TE-C",
    "id": "TE-C-530707-7"
  },
  {
    "srNo": 8,
    "rollNumber": "530708",
    "studentName": "Perke Bhagyash Shivaji",
    "division": "TE-C",
    "id": "TE-C-530708-8"
  },
  {
    "srNo": 9,
    "rollNumber": "530709",
    "studentName": "Phalke Ishwari Sanjay",
    "division": "TE-C",
    "id": "TE-C-530709-9"
  },
  {
    "srNo": 10,
    "rollNumber": "530710",
    "studentName": "Pritam Virendra Dhamde",
    "division": "TE-C",
    "id": "TE-C-530710-10"
  },
  {
    "srNo": 11,
    "rollNumber": "530711",
    "studentName": "Pujari Samarth Suhas",
    "division": "TE-C",
    "id": "TE-C-530711-11"
  },
  {
    "srNo": 12,
    "rollNumber": "530712",
    "studentName": "Pund Prathmesh Sharad",
    "division": "TE-C",
    "id": "TE-C-530712-12"
  },
  {
    "srNo": 13,
    "rollNumber": "530713",
    "studentName": "Wagh Vikram Bhaskar",
    "division": "TE-C",
    "id": "TE-C-530713-13"
  },
  {
    "srNo": 14,
    "rollNumber": "530714",
    "studentName": "Rasal Payal Gorakh",
    "division": "TE-C",
    "id": "TE-C-530714-14"
  },
  {
    "srNo": 15,
    "rollNumber": "530715",
    "studentName": "Redkar Dhruv Dinesh",
    "division": "TE-C",
    "id": "TE-C-530715-15"
  },
  {
    "srNo": 16,
    "rollNumber": "530716",
    "studentName": "Repale Vickyraj Ganesh",
    "division": "TE-C",
    "id": "TE-C-530716-16"
  },
  {
    "srNo": 17,
    "rollNumber": "530717",
    "studentName": "Rokade Kiran Ketan",
    "division": "TE-C",
    "id": "TE-C-530717-17"
  },
  {
    "srNo": 18,
    "rollNumber": "530718",
    "studentName": "Sangale Anant Namdev",
    "division": "TE-C",
    "id": "TE-C-530718-18"
  },
  {
    "srNo": 19,
    "rollNumber": "530719",
    "studentName": "Kale Omkar Ramkisan",
    "division": "TE-C",
    "id": "TE-C-530719-19"
  },
  {
    "srNo": 20,
    "rollNumber": "530720",
    "studentName": "Sawant Sankalp Dattatray",
    "division": "TE-C",
    "id": "TE-C-530720-20"
  },
  {
    "srNo": 21,
    "rollNumber": "530721",
    "studentName": "Sawarkar Yash Sadanand",
    "division": "TE-C",
    "id": "TE-C-530721-21"
  },
  {
    "srNo": 22,
    "rollNumber": "530722",
    "studentName": "Shaikh Imran Md Islam",
    "division": "TE-C",
    "id": "TE-C-530722-22"
  },
  {
    "srNo": 23,
    "rollNumber": "530723",
    "studentName": "Shelar Pratik Balasaheb",
    "division": "TE-C",
    "id": "TE-C-530723-23"
  },
  {
    "srNo": 24,
    "rollNumber": "530724",
    "studentName": "Shelkar Smit Bhausaheb",
    "division": "TE-C",
    "id": "TE-C-530724-24"
  },
  {
    "srNo": 25,
    "rollNumber": "530725",
    "studentName": "Shelke Sahil Vikas",
    "division": "TE-C",
    "id": "TE-C-530725-25"
  },
  {
    "srNo": 26,
    "rollNumber": "530726",
    "studentName": "Shikalgar Tanveer Sayed Samir",
    "division": "TE-C",
    "id": "TE-C-530726-26"
  },
  {
    "srNo": 27,
    "rollNumber": "530727",
    "studentName": "Shinde Akash Rajaram",
    "division": "TE-C",
    "id": "TE-C-530727-27"
  },
  {
    "srNo": 28,
    "rollNumber": "530728",
    "studentName": "Ohol Yash Raju",
    "division": "TE-C",
    "id": "TE-C-530728-28"
  },
  {
    "srNo": 29,
    "rollNumber": "530729",
    "studentName": "Shinde Suraj Ashok",
    "division": "TE-C",
    "id": "TE-C-530729-29"
  },
  {
    "srNo": 30,
    "rollNumber": "530730",
    "studentName": "Shinde Vedant Sachin",
    "division": "TE-C",
    "id": "TE-C-530730-30"
  },
  {
    "srNo": 31,
    "rollNumber": "530731",
    "studentName": "Shingare Shravan Sanjay",
    "division": "TE-C",
    "id": "TE-C-530731-31"
  },
  {
    "srNo": 32,
    "rollNumber": "530732",
    "studentName": "Singh Abhijit Kumar Sanjit",
    "division": "TE-C",
    "id": "TE-C-530732-32"
  },
  {
    "srNo": 33,
    "rollNumber": "530733",
    "studentName": "Soham Sanjaykumar Sonawane",
    "division": "TE-C",
    "id": "TE-C-530733-33"
  },
  {
    "srNo": 34,
    "rollNumber": "530734",
    "studentName": "Somesh Pande",
    "division": "TE-C",
    "id": "TE-C-530734-34"
  },
  {
    "srNo": 35,
    "rollNumber": "530735",
    "studentName": "Sonawane Aryan Prakash",
    "division": "TE-C",
    "id": "TE-C-530735-35"
  },
  {
    "srNo": 36,
    "rollNumber": "530736",
    "studentName": "Swami Mohan Prafulla",
    "division": "TE-C",
    "id": "TE-C-530736-36"
  },
  {
    "srNo": 37,
    "rollNumber": "530737",
    "studentName": "Majage Raj Ramesh",
    "division": "TE-C",
    "id": "TE-C-530737-37"
  },
  {
    "srNo": 38,
    "rollNumber": "530738",
    "studentName": "Thakur Sarthak Anand",
    "division": "TE-C",
    "id": "TE-C-530738-38"
  },
  {
    "srNo": 39,
    "rollNumber": "530739",
    "studentName": "Thorat Yash Rahul",
    "division": "TE-C",
    "id": "TE-C-530739-39"
  },
  {
    "srNo": 40,
    "rollNumber": "530740",
    "studentName": "Tupe Devesh Vinod",
    "division": "TE-C",
    "id": "TE-C-530740-40"
  },
  {
    "srNo": 41,
    "rollNumber": "530741",
    "studentName": "Vaidya Arya Mahesh",
    "division": "TE-C",
    "id": "TE-C-530741-41"
  },
  {
    "srNo": 42,
    "rollNumber": "530742",
    "studentName": "Vaidya Shreya Dharmendra",
    "division": "TE-C",
    "id": "TE-C-530742-42"
  },
  {
    "srNo": 43,
    "rollNumber": "530743",
    "studentName": "Vikram Gorakshnath Patare",
    "division": "TE-C",
    "id": "TE-C-530743-43"
  },
  {
    "srNo": 44,
    "rollNumber": "530744",
    "studentName": "Vinay Sudhakar Salaskar",
    "division": "TE-C",
    "id": "TE-C-530744-44"
  },
  {
    "srNo": 45,
    "rollNumber": "530745",
    "studentName": "Waditake Krishna Ajay",
    "division": "TE-C",
    "id": "TE-C-530745-45"
  },
  {
    "srNo": 46,
    "rollNumber": "530746",
    "studentName": "Wakode Prashik Raju",
    "division": "TE-C",
    "id": "TE-C-530746-46"
  },
  {
    "srNo": 47,
    "rollNumber": "530747",
    "studentName": "Warghude Sanket Sudhakar",
    "division": "TE-C",
    "id": "TE-C-530747-47"
  },
  {
    "srNo": 48,
    "rollNumber": "530748",
    "studentName": "Wason Nakshatra",
    "division": "TE-C",
    "id": "TE-C-530748-48"
  },
  {
    "srNo": 49,
    "rollNumber": "530749",
    "studentName": "Yadav Akash Upendera Kumar",
    "division": "TE-C",
    "id": "TE-C-530749-49"
  },
  {
    "srNo": 50,
    "rollNumber": "530750",
    "studentName": "Yatindra Kumar Jha",
    "division": "TE-C",
    "id": "TE-C-530750-50"
  },
  {
    "srNo": 51,
    "rollNumber": "530751",
    "studentName": "Yeola Unmesh Meghasham",
    "division": "TE-C",
    "id": "TE-C-530751-51"
  },
  {
    "srNo": 52,
    "rollNumber": "530752",
    "studentName": "Dumbare Gauri Balasaheb",
    "division": "TE-C",
    "id": "TE-C-530752-52"
  },
  {
    "srNo": 53,
    "rollNumber": "530753",
    "studentName": "Tagad Siddhi Ganpat",
    "division": "TE-C",
    "id": "TE-C-530753-53"
  },
  {
    "srNo": 54,
    "rollNumber": "530754",
    "studentName": "Kadam Yashraj Abhijeet",
    "division": "TE-C",
    "id": "TE-C-530754-54"
  },
  {
    "srNo": 55,
    "rollNumber": "530755",
    "studentName": "Khomne Prajwal Rajendra",
    "division": "TE-C",
    "id": "TE-C-530755-55"
  },
  {
    "srNo": 56,
    "rollNumber": "530756",
    "studentName": "Pandit Om Ashok",
    "division": "TE-C",
    "id": "TE-C-530756-56"
  },
  {
    "srNo": 57,
    "rollNumber": "530757",
    "studentName": "Pawar Yash Vilas",
    "division": "TE-C",
    "id": "TE-C-530757-57"
  },
  {
    "srNo": 58,
    "rollNumber": "530758",
    "studentName": "Pisal Shankar Satish",
    "division": "TE-C",
    "id": "TE-C-530758-58"
  },
  {
    "srNo": 59,
    "rollNumber": "530759",
    "studentName": "Takalkar Yogesh Gajanan",
    "division": "TE-C",
    "id": "TE-C-530759-59"
  },
  {
    "srNo": 60,
    "rollNumber": "530760",
    "studentName": "Pilane Alok Anil",
    "division": "TE-C",
    "id": "TE-C-530760-60"
  },
  {
    "srNo": 61,
    "rollNumber": "530761",
    "studentName": "Chirivella Sai Prashant Srinivas",
    "division": "TE-C",
    "id": "TE-C-530761-61"
  },
  {
    "srNo": 62,
    "rollNumber": "530762",
    "studentName": "Tanuj Bawankar",
    "division": "TE-C",
    "id": "TE-C-530762-62"
  },
  {
    "srNo": 63,
    "rollNumber": "530763",
    "studentName": "Aryan A. Deshpande",
    "division": "TE-C",
    "id": "TE-C-530763-63"
  },
  {
    "srNo": 64,
    "rollNumber": "530764",
    "studentName": "Narbage Shuddhodhan Ramdas",
    "division": "TE-C",
    "id": "TE-C-530764-64"
  },
  {
    "srNo": 65,
    "rollNumber": "530765",
    "studentName": "Patil Chinmay Vijay",
    "division": "TE-C",
    "id": "TE-C-530765-65"
  },
  {
    "srNo": 66,
    "rollNumber": "530766",
    "studentName": "HAGAWANE SHRINATH DATTATRAY",
    "division": "TE-C",
    "id": "TE-C-530766-66",
  },
  {
    "srNo": 67,
    "rollNumber": "530767",
    "studentName": "Jadhav Vedant Subhash",
    "division": "TE-C",
    "id": "TE-C-530767-67"
  },
  {
    "srNo": 68,
    "rollNumber": "530768",
    "studentName": "Pomaji Utkrant Umesh",
    "division": "TE-C",
    "id": "TE-C-530768-68"
  },
  {
    "srNo": 69,
    "rollNumber": "530769",
    "studentName": "SHAIKH FARHAN SHAIKH USMAN",
    "division": "TE-C",
    "id": "TE-C-530769-69",
  },
  {
    "srNo": 70,
    "rollNumber": "530770",
    "studentName": "Bendale Om Jitendra",
    "division": "TE-C",
    "id": "TE-C-530770-70"
  }
];

  // 10 Approved Name Mappings
  var APPROVED_NAME_MAPPINGS = [
  {
    "submittedName": "SHINDE SURAJ ASHOK",
    "officialName": "Shinde Suraj Ashok",
    "alternateNames": [
      "Suraj Shinde",
      "suraj shinde",
      "shinde suraj ashok"
    ],
    "officialRollNumber": "530729",
    "officialDivision": "TE-C"
  },
  {
    "submittedName": "SINGH ABHIJIT KUMAR SANJIT",
    "officialName": "Singh Abhijit Kumar Sanjit",
    "alternateNames": [
      "Abhijit Singh",
      "abhijit singh",
      "singh abhijit kumar sanjit"
    ],
    "officialRollNumber": "530732",
    "officialDivision": "TE-C"
  },
  {
    "submittedName": "Parvati",
    "officialName": "Gopchade Parvati Shesherao",
    "alternateNames": [
      "GOPCHADE PARVATI SHESHERAO",
      "parvati",
      "gopchade parvati shesherao"
    ],
    "officialRollNumber": "530565",
    "officialDivision": "TE-A"
  },
  {
    "submittedName": "HIWARALE PARITOSH ANIL",
    "officialName": "Hiwarale Paritosh Anil",
    "alternateNames": [
      "Paritosh Anil Hiwrale",
      "paritosh anil hiwrale",
      "hiwarale paritosh anil",
      "paritosh hiwrale"
    ],
    "officialRollNumber": "530607",
    "officialDivision": "TE-B"
  },
  {
    "submittedName": "KALE SONIYA GOVINDRAO",
    "officialName": "Kale Soniya Govindrao",
    "alternateNames": [
      "Soniya Kale",
      "soniya kale",
      "kale soniya govindrao",
      "soniyakale"
    ],
    "officialRollNumber": "530662",
    "officialDivision": "TE-B"
  },
  {
    "submittedName": "SHINGARE SHRAVAN SANJAY",
    "officialName": "Shingare Shravan Sanjay",
    "alternateNames": [
      "Shravan Sanjay Shingare",
      "Shrvan Sanjay Shingare",
      "shravan sanjay shingare",
      "shrvan sanjay shingare",
      "shravan/shrvan sanjay shingare"
    ],
    "officialRollNumber": "530731",
    "officialDivision": "TE-C"
  },
  {
    "submittedName": "DOLE NITIN SAMADHAN",
    "officialName": "Dole Nitin Samadhan",
    "alternateNames": [
      "Nitin Dole",
      "nitin dole",
      "dole nitin samadhan"
    ],
    "officialRollNumber": "530544",
    "officialDivision": "TE-A"
  },
  {
    "submittedName": "Namrata Anil Gaikwad",
    "officialName": "Gaikwad Namrata Anil",
    "alternateNames": [
      "GAIKWAD NAMRATA ANIL",
      "namrata anil gaikwad",
      "gaikwad namrata anil",
      "namrata gaikwad"
    ],
    "officialRollNumber": "530548",
    "officialDivision": "TE-A"
  },
  {
    "submittedName": "Moeen Shaikh",
    "officialName": "Moeen Fakruddin Dodamani Shaikh",
    "alternateNames": [
      "Moeen Fakruddin Dodamani Shaikh",
      "moeen shaikh",
      "moeen fakruddin dodamani shaikh"
    ],
    "officialRollNumber": "530557",
    "officialDivision": "TE-A"
  },
  {
    "submittedName": "Srushti Jadhav",
    "officialName": "Jadhav Srushti Pandurang",
    "alternateNames": [
      "JADHAV SRUSHTI PANDURANG",
      "srushti jadhav",
      "jadhav srushti pandurang"
    ],
    "officialRollNumber": "530561",
    "officialDivision": "TE-A"
  }
];

  // Authoritative Student Roster Identifiers
  var AUTHORITATIVE_STUDENTS = [
    {
      officialName: "SANSKAR KISAN KAMBLE",
      division: "TE-B",
      rollNumber: "530630",
      submittedNameVariants: [
        "Sanskar",
        "sanskar",
        "SANSKAR",
        "Sanskar Kisan Kamble",
        "sanskar kisan kamble",
        "SANSKAR KISAN KAMBLE"
      ],
      submittedRolls: ["17", "530630"],
      submittedDivisions: ["A", "TE-A", "B", "TE-B"],
    },
    {
      officialName: "GOPALE PAYAL SUBHASH",
      division: "TE-B",
      rollNumber: "530653",
      submittedNameVariants: [
        "Payal Gopale",
        "payal gopale",
        "payal subhash Gopale",
        "Payal Subhash Gopale",
        "payal subhash gopale",
        "Payal subhash Gopale",
        "GOPALE PAYAL SUBHASH",
        "gopale payal subhash"
      ],
    },
    {
      officialName: "BHOR TANUJA BHARAT",
      division: "TE-A",
      rollNumber: "530563",
      submittedNameVariants: [
        "Tanuja Bhor",
        "tanuja bhor",
        "TANUJA BHOR",
        "Bhor Tanuja Bharat",
        "bhor tanuja bharat",
        "BHOR TANUJA BHARAT"
      ],
    },
    {
      officialName: "HAGAWANE SHRINATH DATTATRAY",
      division: "TE-C",
      rollNumber: "530766",
      submittedNameVariants: [
        "shrinath hagawane",
        "Shrinath Hagawane",
        "Shrinath hagawane",
        "Hagawane Shrinath Dattatray",
        "hagawane shrinath dattatray",
        "HAGAWANE SHRINATH DATTATRAY"
      ],
    },
    {
      officialName: "SHAIKH FARHAN SHAIKH USMAN",
      division: "TE-C",
      rollNumber: "530769",
      submittedNameVariants: [
        "Shaikh farhan usman",
        "shaikh farhan usman",
        "Shaikh Farhan Usman",
        "Shaikh farhan shaikh usman",
        "shaikh farhan shaikh usman",
        "Shaikh Farhan Shaikh Usman",
        "SHAIKH FARHAN SHAIKH USMAN"
      ],
    }
  ];

  // 12 Confirmed Approved Non-Roster / Unmapped College Students (AUTH-02 to AUTH-13)
  // These students belong to our college and submitted assignments, but are not listed on the 216-student official attendance roster.
  var UNMAPPED_STUDENTS = [
    // TE-A (6 unmapped students)
    {
      srNo: 72,
      rollNumber: "10",
      studentName: "Tanvi Gurunath Chavan",
      originalName: "Tanvi Gurunath Chavan",
      submittedNames: ["Tanvi Gurunath Chavan", "tanvi gurunath chavan", "Tanvi Chavan"],
      submittedRolls: ["10"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-10-AUTH-03",
      ruleId: "AUTH-03",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 73,
      rollNumber: "64",
      studentName: "Kunjir Vaibhav Balasaheb",
      originalName: "Kunjir Vaibhav Balasaheb",
      submittedNames: ["Kunjir Vaibhav Balasaheb", "Vaibhav Kunjir"],
      submittedRolls: ["64"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-64-AUTH-06",
      ruleId: "AUTH-06",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 74,
      rollNumber: "72",
      studentName: "Sujal Shivrj Biradar",
      originalName: "Sujal Biradar",
      submittedNames: ["Sujal Biradar"],
      submittedRolls: ["72"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-72-AUTH-13",
      ruleId: "AUTH-13",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 75,
      rollNumber: "73",
      studentName: "Ghayal Omkar Namdev",
      originalName: "OMKAR NAMDEV GHAYAL",
      submittedNames: ["omkar ghayal", "OMKAR NAMDEV GHAYAL", "Omkar Namdev Ghayal", "OMKAR Namdev Ghayal"],
      submittedRolls: ["73", "530573"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-73-AUTH-10",
      ruleId: "AUTH-10",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 76,
      rollNumber: "530509",
      studentName: "Supe Tanay Pravin",
      originalName: "Tanay Supe",
      submittedNames: ["Tanay Supe"],
      submittedRolls: ["530509", "530509 TE- A"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-530509-AUTH-05",
      ruleId: "AUTH-05",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 77,
      rollNumber: "530512",
      studentName: "Samarth Balu Supekar",
      originalName: "samarth supekar",
      submittedNames: ["samarth supekar", "Samarth supekar"],
      submittedRolls: ["530512"],
      division: "TE-A",
      id: "TE-A-UNMAPPED-530512-AUTH-02",
      ruleId: "AUTH-02",
      isOfficialRoster: false,
      isUnmapped: true
    },

    // TE-B (2 unmapped students)
    {
      srNo: 76,
      rollNumber: "71",
      studentName: "Panda Himanshu Mitu",
      originalName: "Himanshu Panda",
      submittedNames: ["Himanshu Panda"],
      submittedRolls: ["71"],
      division: "TE-B",
      id: "TE-B-UNMAPPED-71-AUTH-12",
      ruleId: "AUTH-12",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 77,
      rollNumber: "530672",
      studentName: "Soham Satyajit Kadam",
      originalName: "Soham satyajit Kadam",
      submittedNames: ["soham satyajit kadam", "Soham satyajit Kadam"],
      submittedRolls: ["72", "530672"],
      division: "TE-B",
      id: "TE-B-UNMAPPED-530672-AUTH-09",
      ruleId: "AUTH-09",
      isOfficialRoster: false,
      isUnmapped: true
    },

    // TE-C (4 unmapped students)
    {
      srNo: 71,
      rollNumber: "530745",
      studentName: "Ghule Omkar Subhash",
      originalName: "OMKAR S GHULE",
      submittedNames: ["OMKAR S GHULE"],
      submittedRolls: ["530745"],
      division: "TE-C",
      id: "TE-C-UNMAPPED-530745-AUTH-04",
      ruleId: "AUTH-04",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 72,
      rollNumber: "530750",
      studentName: "Prartmesh D. Dagade",
      originalName: "Prathmesh Dagade",
      submittedNames: ["Prathmesh Dagade"],
      submittedRolls: ["530750"],
      division: "TE-C",
      id: "TE-C-UNMAPPED-530750-AUTH-08",
      ruleId: "AUTH-08",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 73,
      rollNumber: "530764",
      studentName: "Vetal Tejas Raghunath",
      originalName: "Tejas Vetal",
      submittedNames: ["Tejas Vetal"],
      submittedRolls: ["530764"],
      division: "TE-C",
      id: "TE-C-UNMAPPED-530764-AUTH-07",
      ruleId: "AUTH-07",
      isOfficialRoster: false,
      isUnmapped: true
    },
    {
      srNo: 74,
      rollNumber: "530771",
      studentName: "Sahil Ravindra Patil",
      originalName: "SAHIL RAVINDRA PATIL",
      submittedNames: ["SAHIL Ravindra Patil", "SAHIL RAVINDRA PATIL"],
      submittedRolls: ["530771"],
      division: "TE-C",
      id: "TE-C-UNMAPPED-530771-AUTH-11",
      ruleId: "AUTH-11",
      isOfficialRoster: false,
      isUnmapped: true
    }
  ];

  function matchAuthoritativeMapping(nameStr, rollStr, divStr) {
    var norm = normalize(nameStr);
    if (!norm) return null;
    var inputTokens = tokenize(nameStr);

    for (var i = 0; i < AUTHORITATIVE_STUDENTS.length; i++) {
      var auth = AUTHORITATIVE_STUDENTS[i];
      if (normalize(auth.officialName) === norm) return auth;
      for (var v = 0; v < auth.submittedNameVariants.length; v++) {
        if (normalize(auth.submittedNameVariants[v]) === norm) {
          // If specific rolls or divisions are required for variant, check them
          if (auth.submittedRolls && rollStr) {
            var cRoll = String(rollStr).trim();
            if (auth.submittedRolls.indexOf(cRoll) !== -1) return auth;
          } else {
            return auth;
          }
        }
      }
      // Check token match
      if (inputTokens.length >= 2) {
        var offTokens = tokenize(auth.officialName);
        var matchCount = 0;
        for (var t = 0; t < inputTokens.length; t++) {
          if (offTokens.indexOf(inputTokens[t]) !== -1) matchCount++;
        }
        if (matchCount >= 2 && matchCount >= inputTokens.length) return auth;
      }
    }
    return null;
  }

  /**
   * Matches a submission against the full authoritative mapping register.
   * Covers:
   * 1. Test records (TEST_RECORD)
   * 2. External college exclusions (EXTERNAL_OR_NON_COLLEGE)
   * 3. Authoritative official roster matches (OFFICIAL_ROSTER_MATCH)
   * 4. Approved non-roster identities (APPROVED_IDENTITY_UNLINKED_TO_ROSTER)
   */
  function matchAuthoritativeRegistry(record) {
    if (!record) return null;
    var rawName = String(record.studentName || '').trim();
    var rawRoll = String(record.rollNumber || '').trim();
    var rawDiv = String(record.division || '').trim().toUpperCase();

    // 1. Test record exclusions
    if (rawName === 'j' && rawRoll === '610') {
      return {
        type: 'TEST_RECORD',
        ruleId: 'TEST-01',
        rationale: 'Benchmark / test submission.'
      };
    }
    if (/test|latetest|later|mmn/i.test(rawName) || /^t\d+/i.test(rawRoll)) {
      return {
        type: 'TEST_RECORD',
        ruleId: 'TEST-02',
        rationale: 'Benchmark / test submission.'
      };
    }

    // 2. External college exclusions
    if (/rutika.*jadhav|jadhav.*rutika/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-01',
        rationale: 'External non-college submission.'
      };
    }
    if (/yogesh.*bhujadi/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-02',
        rationale: 'External non-college submission.'
      };
    }
    if (/gawade.*anushka/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-03',
        rationale: 'External non-college submission.'
      };
    }
    if (/bhavana.*gholap|gholap.*bhavana/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-04',
        rationale: 'External non-college submission.'
      };
    }
    if (/mahesh.*waghmare/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-05',
        rationale: 'External non-college submission.'
      };
    }
    if (/mugdha benkar/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-06',
        rationale: 'External non-college submission.'
      };
    }
    if (/gunjal sanskar/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-07',
        rationale: 'External non-college submission.'
      };
    }
    if (/srushti.*gadhave/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-08',
        rationale: 'External non-college submission.'
      };
    }
    if (/dongare.*omkar|omkar.*dongare/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-09',
        rationale: 'External non-college submission.'
      };
    }
    if (/bhujbal.*krushnali/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-10',
        rationale: 'External non-college submission.'
      };
    }
    if (/prathamesh rajesh gunjal/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-11',
        rationale: 'External non-college submission.'
      };
    }
    if (rawName === 'Om' && rawRoll === '23') {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-12',
        rationale: 'External non-college submission.'
      };
    }
    if (/fulsundar/i.test(rawName)) {
      return {
        type: 'EXTERNAL_OR_NON_COLLEGE',
        ruleId: 'EXT-13',
        rationale: 'External non-college submission.'
      };
    }

    // 3. Official Roster Authoritative Matches
    if (/^Sanskar$/i.test(rawName) && rawRoll === '17') {
      return {
        type: 'OFFICIAL_ROSTER_MATCH',
        ruleId: 'AUTH-01',
        officialName: 'SANSKAR KISAN KAMBLE',
        rollNumber: '530630',
        division: 'TE-B',
        rationale: 'Authoritative roster match: SANSKAR KISAN KAMBLE (TE-B, 530630).'
      };
    }
    if (/shaikh farhan/i.test(rawName) && (rawRoll === '769' || rawDiv === 'D')) {
      return {
        type: 'OFFICIAL_ROSTER_MATCH',
        ruleId: 'AUTH-14',
        officialName: 'SHAIKH FARHAN SHAIKH USMAN',
        rollNumber: '530769',
        division: 'TE-C',
        rationale: 'Authoritative roster match: SHAIKH FARHAN SHAIKH USMAN (TE-C, 530769).'
      };
    }
    if (/payal.*gopale|gopale.*payal/i.test(rawName)) {
      return {
        type: 'OFFICIAL_ROSTER_MATCH',
        ruleId: 'AUTH-15',
        officialName: 'GOPALE PAYAL SUBHASH',
        rollNumber: '530653',
        division: 'TE-B',
        rationale: 'Authoritative roster match: GOPALE PAYAL SUBHASH (TE-B, 530653).'
      };
    }
    if (/tanuja.*bhor|bhor.*tanuja/i.test(rawName)) {
      return {
        type: 'OFFICIAL_ROSTER_MATCH',
        ruleId: 'AUTH-16',
        officialName: 'BHOR TANUJA BHARAT',
        rollNumber: '530563',
        division: 'TE-A',
        rationale: 'Authoritative roster match: BHOR TANUJA BHARAT (TE-A, 530563).'
      };
    }
    if (/shrinath.*hagawane|hagawane.*shrinath/i.test(rawName)) {
      return {
        type: 'OFFICIAL_ROSTER_MATCH',
        ruleId: 'AUTH-17',
        officialName: 'HAGAWANE SHRINATH DATTATRAY',
        rollNumber: '530766',
        division: 'TE-C',
        rationale: 'Authoritative roster match: HAGAWANE SHRINATH DATTATRAY (TE-C, 530766).'
      };
    }

    // 4. Approved Non-Roster Identities
    if (/samarth supekar/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-02',
        resolvedOfficialName: 'Samarth Balu Supekar',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/tanvi.*chavan/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-03',
        resolvedOfficialName: 'Tanvi Gurunath Chavan',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/omkar s ghule|omkar s\. ghule/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-04',
        resolvedOfficialName: 'Ghule Omkar Subhash',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/tanay supe/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-05',
        resolvedOfficialName: 'Supe Tanay Pravin',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/vaibhav kunjir|kunjir vaibhav/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-06',
        resolvedOfficialName: 'Kunjir Vaibhav Balasaheb',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/tejas vetal/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-07',
        resolvedOfficialName: 'Vetal Tejas Raghunath',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/prathmesh dagade/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-08',
        resolvedOfficialName: 'Prartmesh D. Dagade',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/soham satyajit kadam/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-09',
        resolvedOfficialName: 'Soham Satyajit Kadam',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/omkar.*ghayal/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-10',
        resolvedOfficialName: 'Ghayal Omkar Namdev',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/sahil.*patil/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-11',
        resolvedOfficialName: 'Sahil Ravindra Patil',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/himanshu panda/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-12',
        resolvedOfficialName: 'Panda Himanshu Mitu',
        rationale: 'Approved identity not on official roster.'
      };
    }
    if (/sujal biradar/i.test(rawName)) {
      return {
        type: 'APPROVED_IDENTITY_UNLINKED_TO_ROSTER',
        ruleId: 'AUTH-13',
        resolvedOfficialName: 'Sujal Shivrj Biradar',
        rationale: 'Approved identity not on official roster.'
      };
    }

    return null;
  }

  function normalize(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function tokenize(str) {
    var norm = normalize(str);
    if (!norm) return [];
    return norm.split(/\s+/);
  }

  /**
   * Checks if an input name matches one of the 10 approved name mappings.
   */
  function matchApprovedMapping(nameStr) {
    var norm = normalize(nameStr);
    if (!norm) return null;

    var inputTokens = tokenize(nameStr);

    for (var i = 0; i < APPROVED_NAME_MAPPINGS.length; i++) {
      var app = APPROVED_NAME_MAPPINGS[i];
      if (normalize(app.submittedName) === norm || normalize(app.officialName) === norm) {
        return app;
      }
      for (var a = 0; a < app.alternateNames.length; a++) {
        if (normalize(app.alternateNames[a]) === norm) {
          return app;
        }
      }

      // Check token set equality (order independent) against submitted and official names
      if (inputTokens.length >= 2) {
        var subTokens = tokenize(app.submittedName);
        if (subTokens.length === inputTokens.length) {
          var matchSub = true;
          for (var sIdx = 0; sIdx < inputTokens.length; sIdx++) {
            if (subTokens.indexOf(inputTokens[sIdx]) === -1) {
              matchSub = false;
              break;
            }
          }
          if (matchSub) return app;
        }

        var offTokens = tokenize(app.officialName);
        if (offTokens.length === inputTokens.length) {
          var matchOff = true;
          for (var oIdx = 0; oIdx < inputTokens.length; oIdx++) {
            if (offTokens.indexOf(inputTokens[oIdx]) === -1) {
              matchOff = false;
              break;
            }
          }
          if (matchOff) return app;
        }
      }
    }
    return null;
  }

  /**
   * Finds students by official roll number.
   * Returns array (length 1 for standard rolls, length 2 for TE-B duplicates).
   */
  function findByRollNumber(rollNum) {
    var clean = String(rollNum || '').trim();
    if (!clean) return [];
    var results = STUDENTS.filter(function (s) {
      return s.rollNumber === clean;
    });
    for (var u = 0; u < UNMAPPED_STUDENTS.length; u++) {
      if (UNMAPPED_STUDENTS[u].rollNumber === clean || (UNMAPPED_STUDENTS[u].submittedRolls && UNMAPPED_STUDENTS[u].submittedRolls.indexOf(clean) !== -1)) {
        results.push(UNMAPPED_STUDENTS[u]);
      }
    }
    return results;
  }

  /**
   * Finds student by unique roster identifier (e.g. 'TE-A-530501-1').
   */
  function findById(id) {
    if (!id) return null;
    for (var i = 0; i < STUDENTS.length; i++) {
      if (STUDENTS[i].id === id) return STUDENTS[i];
    }
    for (var u = 0; u < UNMAPPED_STUDENTS.length; u++) {
      if (UNMAPPED_STUDENTS[u].id === id) return UNMAPPED_STUDENTS[u];
    }
    return null;
  }

  /**
   * Parses official attendance roster dynamically from an Excel workbook (.xlsx).
   * Supports:
   * - Three separate division sheets: TE-A, TE-B, TE-C (or Div A, Division A, etc.)
   * - A single combined Official_Roster / Roster sheet with a Division column
   * - Handles ArrayBuffer, Uint8Array, Buffer, or pre-parsed workbook object
   * - Validates roll numbers, student names, divisions, duplicate records, missing values
   */
  function parseRosterFromWorkbook(workbookOrData, xlsxLib) {
    var XLSX = xlsxLib;
    if (!XLSX) {
      if (typeof window !== 'undefined' && window.XLSX) {
        XLSX = window.XLSX;
      } else if (typeof require !== 'undefined') {
        try {
          XLSX = require('./vendor/xlsx.full.min.js');
        } catch (e) {
          try { XLSX = require('xlsx'); } catch (e2) {}
        }
      }
    }

    if (!XLSX) {
      throw new Error('SheetJS (XLSX) library is required to parse Excel workbooks.');
    }

    var wb = workbookOrData;
    if (!wb || !wb.Sheets) {
      try {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(workbookOrData)) {
          wb = XLSX.read(workbookOrData, { type: 'buffer' });
        } else if (workbookOrData instanceof ArrayBuffer) {
          wb = XLSX.read(new Uint8Array(workbookOrData), { type: 'array' });
        } else if (typeof workbookOrData === 'string') {
          wb = XLSX.read(workbookOrData, { type: 'binary' });
        } else {
          wb = XLSX.read(workbookOrData, { type: 'array' });
        }
      } catch (parseErr) {
        throw new Error('Failed to read Excel workbook: ' + parseErr.message);
      }
    }

    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('Workbook contains no sheets.');
    }

    var result = {
      success: false,
      students: [],
      totalStudents: 0,
      divisionCounts: { 'TE-A': 0, 'TE-B': 0, 'TE-C': 0 },
      duplicateRolls: [],
      validationErrors: [],
      validationWarnings: [],
      source: 'EXCEL_IMPORT',
      isLive: true
    };

    var rollCounts = {};

    function findSheetByName(nameOptions) {
      for (var o = 0; o < nameOptions.length; o++) {
        var opt = nameOptions[o].toUpperCase().trim();
        for (var s = 0; s < wb.SheetNames.length; s++) {
          var cleanSheet = wb.SheetNames[s].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          var cleanOpt = opt.replace(/[^A-Za-z0-9]/g, '');
          if (cleanSheet === cleanOpt || wb.SheetNames[s].toUpperCase().trim() === opt) {
            return { name: wb.SheetNames[s], sheet: wb.Sheets[wb.SheetNames[s]] };
          }
        }
      }
      return null;
    }

    var foundDivisions = 0;
    var targetDivisions = ['TE-A', 'TE-B', 'TE-C'];

    for (var d = 0; d < targetDivisions.length; d++) {
      var div = targetDivisions[d];
      var sheetMatch = findSheetByName([div, 'DIV ' + div.replace('TE-', ''), 'DIVISION ' + div.replace('TE-', '')]);
      if (!sheetMatch) continue;

      foundDivisions++;
      var sheet = sheetMatch.sheet;
      var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

      var headerIdx = -1;
      var srCol = 0, rollCol = 1, nameCol = 2;

      for (var r = 0; r < Math.min(10, rows.length); r++) {
        var row = rows[r];
        if (!Array.isArray(row)) continue;
        var rowText = row.map(function (c) { return String(c || '').toLowerCase(); }).join(' ');
        if (rowText.indexOf('roll') !== -1 && (rowText.indexOf('name') !== -1 || rowText.indexOf('student') !== -1)) {
          headerIdx = r;
          for (var c = 0; c < row.length; c++) {
            var val = String(row[c] || '').toLowerCase();
            if (val.indexOf('sr') !== -1 || val.indexOf('s.no') !== -1 || val.indexOf('serial') !== -1) srCol = c;
            if (val.indexOf('roll') !== -1) rollCol = c;
            if (val.indexOf('name') !== -1 || val.indexOf('student') !== -1) nameCol = c;
          }
          break;
        }
      }

      if (headerIdx === -1) headerIdx = 0;

      var divCount = 0;
      for (var i = headerIdx + 1; i < rows.length; i++) {
        var stRow = rows[i];
        if (!Array.isArray(stRow) || stRow.length === 0) continue;

        var rawRoll = stRow[rollCol];
        var rawName = stRow[nameCol];
        var rawSr = stRow[srCol];

        if (rawRoll === undefined || rawRoll === null || String(rawRoll).trim() === '') {
          continue;
        }

        var cleanRoll = String(rawRoll).trim();
        var cleanName = String(rawName || '').trim();

        var lowRoll = cleanRoll.toLowerCase();
        if (lowRoll.indexOf('roll') !== -1 || lowRoll.indexOf('total') !== -1 || lowRoll.indexOf('average') !== -1) {
          continue;
        }

        if (!cleanName) {
          result.validationErrors.push('Row ' + (i + 1) + ' in sheet "' + sheetMatch.name + '" has Roll Number "' + cleanRoll + '" but is missing student name.');
          continue;
        }

        var srNo = parseInt(rawSr, 10) || (divCount + 1);
        var studentId = div + '-' + cleanRoll + '-' + srNo;
        
        // Authoritative student identity overrides on imported workbook
        if (div === 'TE-B' && cleanRoll === '530653') {
          cleanName = 'GOPALE PAYAL SUBHASH';
        } else if (div === 'TE-A' && cleanRoll === '530564') {
          cleanName = 'Gopale Payal Subhash (Reassigned to TE-B 530653)';
        } else if (div === 'TE-A' && cleanRoll === '530563') {
          cleanName = 'BHOR TANUJA BHARAT';
        } else if (div === 'TE-C' && cleanRoll === '530766') {
          cleanName = 'HAGAWANE SHRINATH DATTATRAY';
        } else if (div === 'TE-C' && cleanRoll === '530769') {
          cleanName = 'SHAIKH FARHAN SHAIKH USMAN';
        } else if (div === 'TE-B' && cleanRoll === '530630') {
          cleanName = 'Sanskar Kisan Kamble';
        }

        rollCounts[cleanRoll] = (rollCounts[cleanRoll] || 0) + 1;

        result.students.push({
          srNo: srNo,
          rollNumber: cleanRoll,
          studentName: cleanName,
          division: div,
          id: studentId,
          source: 'EXCEL_IMPORT',
          isLive: true
        });
        divCount++;
      }

      result.divisionCounts[div] = divCount;
    }

    if (foundDivisions === 0) {
      var combinedMatch = findSheetByName(['OFFICIAL_ROSTER', 'OFFICIAL ROSTER', 'ROSTER', 'ATTENDANCE', 'STUDENTS']);
      if (combinedMatch) {
        var cRows = XLSX.utils.sheet_to_json(combinedMatch.sheet, { header: 1 });
        if (cRows && cRows.length >= 2) {
          var cHeaderIdx = 0;
          var cSrCol = 0, cRollCol = 1, cNameCol = 2, cDivCol = -1;
          for (var cr = 0; cr < Math.min(10, cRows.length); cr++) {
            var cRow = cRows[cr];
            if (!Array.isArray(cRow)) continue;
            var cText = cRow.map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
            if (cText.indexOf('roll') !== -1 && (cText.indexOf('name') !== -1 || cText.indexOf('student') !== -1)) {
              cHeaderIdx = cr;
              for (var cc = 0; cc < cRow.length; cc++) {
                var cv = String(cRow[cc] || '').toLowerCase();
                if (cv.indexOf('sr') !== -1 || cv.indexOf('s.no') !== -1) cSrCol = cc;
                if (cv.indexOf('roll') !== -1) cRollCol = cc;
                if (cv.indexOf('name') !== -1 || cv.indexOf('student') !== -1) cNameCol = cc;
                if (cv.indexOf('div') !== -1) cDivCol = cc;
              }
              break;
            }
          }

          for (var ci = cHeaderIdx + 1; ci < cRows.length; ci++) {
            var cStRow = cRows[ci];
            if (!Array.isArray(cStRow) || cStRow.length === 0) continue;
            var cRoll = String(cStRow[cRollCol] || '').trim();
            var cName = String(cStRow[cNameCol] || '').trim();
            if (!cRoll || cRoll.toLowerCase().indexOf('roll') !== -1) continue;
            if (!cName) continue;

            var cDiv = cDivCol !== -1 ? String(cStRow[cDivCol] || 'TE-A').trim().toUpperCase() : 'TE-A';
            if (cDiv.indexOf('TE-') === -1) {
              if (cDiv === 'A' || cDiv === 'B' || cDiv === 'C') cDiv = 'TE-' + cDiv;
            }
            var cSr = parseInt(cStRow[cSrCol], 10) || (result.students.length + 1);

            rollCounts[cRoll] = (rollCounts[cRoll] || 0) + 1;
            result.students.push({
              srNo: cSr,
              rollNumber: cRoll,
              studentName: cName,
              division: cDiv,
              id: cDiv + '-' + cRoll + '-' + cSr,
              source: 'EXCEL_IMPORT',
              isLive: true
            });
            result.divisionCounts[cDiv] = (result.divisionCounts[cDiv] || 0) + 1;
          }
        }
      }
    }

    for (var rk in rollCounts) {
      if (rollCounts[rk] > 1) {
        result.duplicateRolls.push(rk);
      }
    }

    result.totalStudents = result.students.length;
    result.success = result.totalStudents > 0;

    if (!result.success && result.validationErrors.length === 0) {
      result.validationErrors.push('No student records found in sheets TE-A, TE-B, TE-C, or Official_Roster.');
    }

    return result;
  }

  return {
    DIVISIONS: DIVISIONS,
    DUPLICATE_ROLLS_TE_B: DUPLICATE_ROLLS_TE_B,
    STUDENTS: STUDENTS,
    OFFLINE_FIXTURE_STUDENTS: STUDENTS,
    UNMAPPED_STUDENTS: UNMAPPED_STUDENTS,
    APPROVED_NAME_MAPPINGS: APPROVED_NAME_MAPPINGS,
    AUTHORITATIVE_STUDENTS: AUTHORITATIVE_STUDENTS,
    normalize: normalize,
    tokenize: tokenize,
    matchApprovedMapping: matchApprovedMapping,
    matchAuthoritativeMapping: matchAuthoritativeMapping,
    matchAuthoritativeRegistry: matchAuthoritativeRegistry,
    findByRollNumber: findByRollNumber,
    findById: findById,
    parseRosterFromWorkbook: parseRosterFromWorkbook
  };
}));
