export class Address {
  country: string;
  city: string;
  district: string;
  no: number;
  userId: number;


  constructor(country: string, city: string, district: string, no: number, userId: number) {
    this.country = country;
    this.city = city;
    this.district = district;
    this.no = no;
    this.userId = userId;
  }
}
